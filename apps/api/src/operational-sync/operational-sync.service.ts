import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const DEFAULT_STORES: Record<string, Prisma.InputJsonValue> = {
  tasks: [],
  'general-instructions': [],
  'operations-center': { loans: [], equipment: [] },
  'function-sheets': [],
  'meeting-rooms': [],
};

@Injectable()
export class OperationalSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async get(hotelId: string | undefined, namespace: string, userId?: string) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, userId);
    const existing = await this.prisma.operationalStore.findUnique({
      where: { hotelId_namespace: { hotelId: resolvedHotelId, namespace } },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } } },
      },
    });

    if (existing) return existing;

    const defaultPayload = DEFAULT_STORES[namespace];
    if (defaultPayload === undefined) return null;

    return this.prisma.operationalStore.create({
      data: {
        hotelId: resolvedHotelId,
        namespace,
        payload: defaultPayload,
        updatedById: userId,
      },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } } },
      },
    });
  }

  async save(input: {
    hotelId?: string;
    namespace: string;
    payload: Prisma.InputJsonValue;
    updatedById?: string;
    expectedVersion?: number;
  }) {
    const hotelId = await this.resolveHotelId(input.hotelId, input.updatedById);
    const current = await this.prisma.operationalStore.findUnique({
      where: { hotelId_namespace: { hotelId, namespace: input.namespace } },
    });

    if (current && input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new ConflictException({
        message: 'Ces données ont été modifiées par un autre utilisateur.',
        currentVersion: current.version,
        updatedAt: current.updatedAt,
      });
    }

    return this.prisma.operationalStore.upsert({
      where: { hotelId_namespace: { hotelId, namespace: input.namespace } },
      create: {
        hotelId,
        namespace: input.namespace,
        payload: input.payload,
        updatedById: input.updatedById,
      },
      update: {
        payload: input.payload,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } } },
      },
    });
  }

  async list(hotelId?: string, userId?: string) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, userId);
    await this.ensureDefaultStores(resolvedHotelId, userId);
    return this.prisma.operationalStore.findMany({
      where: { hotelId: resolvedHotelId },
      select: { namespace: true, version: true, updatedAt: true, updatedById: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async diagnostic(hotelId?: string, userId?: string) {
    const startedAt = Date.now();
    const resolvedHotelId = await this.resolveHotelId(hotelId, userId);
    await this.ensureDefaultStores(resolvedHotelId, userId);

    const [hotel, user, stores, databaseProbe] = await Promise.all([
      this.prisma.hotel.findUnique({ where: { id: resolvedHotelId }, select: { id: true, name: true, slug: true } }),
      userId ? this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, email: true, hotelId: true, role: { select: { name: true } } } }) : null,
      this.prisma.operationalStore.findMany({
        where: { hotelId: resolvedHotelId },
        select: { namespace: true, version: true, updatedAt: true, updatedById: true },
        orderBy: { namespace: 'asc' },
      }),
      this.prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`,
    ]);

    return {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      database: { connected: true, serverTime: databaseProbe[0]?.now ?? null },
      hotel,
      user,
      operationalStore: { available: true, namespaces: stores },
    };
  }

  private async ensureDefaultStores(hotelId: string, userId?: string) {
    await this.prisma.$transaction(
      Object.entries(DEFAULT_STORES).map(([namespace, payload]) =>
        this.prisma.operationalStore.upsert({
          where: { hotelId_namespace: { hotelId, namespace } },
          create: { hotelId, namespace, payload, updatedById: userId },
          update: {},
        }),
      ),
    );
  }

  private async resolveHotelId(hotelId?: string, userId?: string) {
    if (hotelId) return hotelId;
    if (!userId) throw new BadRequestException('Hôtel et utilisateur absents.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hotelId: true } });
    if (!user) throw new BadRequestException('Utilisateur introuvable.');
    return user.hotelId;
  }
}
