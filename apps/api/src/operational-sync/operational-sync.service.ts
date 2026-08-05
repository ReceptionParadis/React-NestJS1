import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OperationalSyncService {
  constructor(private readonly prisma: PrismaService) {}

  get(hotelId: string, namespace: string) {
    return this.prisma.operationalStore.findUnique({
      where: { hotelId_namespace: { hotelId, namespace } },
      include: {
        updatedBy: { select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } } },
      },
    });
  }

  async save(input: {
    hotelId: string;
    namespace: string;
    payload: Prisma.InputJsonValue;
    updatedById?: string;
    expectedVersion?: number;
  }) {
    const current = await this.prisma.operationalStore.findUnique({
      where: { hotelId_namespace: { hotelId: input.hotelId, namespace: input.namespace } },
    });

    if (current && input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new ConflictException({
        message: 'Ces données ont été modifiées par un autre utilisateur.',
        currentVersion: current.version,
        updatedAt: current.updatedAt,
      });
    }

    return this.prisma.operationalStore.upsert({
      where: { hotelId_namespace: { hotelId: input.hotelId, namespace: input.namespace } },
      create: {
        hotelId: input.hotelId,
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

  list(hotelId: string) {
    return this.prisma.operationalStore.findMany({
      where: { hotelId },
      select: { namespace: true, version: true, updatedAt: true, updatedById: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
