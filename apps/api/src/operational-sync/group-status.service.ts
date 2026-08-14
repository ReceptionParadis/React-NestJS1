import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type GroupRecord = Record<string, unknown> & { id?: string; name?: string; status?: string; audit?: unknown[] };

@Injectable()
export class GroupStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async arrive(input: { hotelId?: string; userId?: string; groupId: string; actorName?: string; actorRole?: string }) {
    const hotelId = await this.resolveHotelId(input.hotelId, input.userId);
    const atIso = new Date().toISOString();
    const atLabel = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    const actorName = String(input.actorName || 'Utilisateur HospiCore').trim() || 'Utilisateur HospiCore';
    const actorRole = String(input.actorRole || 'Réception').trim() || 'Réception';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const store = await this.prisma.operationalStore.findUnique({
        where: { hotelId_namespace: { hotelId, namespace: 'group-360' } },
      });
      if (!store) throw new NotFoundException('Store group-360 introuvable.');
      if (!Array.isArray(store.payload)) throw new BadRequestException('Données groupes invalides.');

      let found = false;
      const next = (store.payload as unknown[]).map(value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
        const group = value as GroupRecord;
        if (String(group.id || '') !== input.groupId) return value;
        found = true;
        if (['Arrivé', 'En séjour', 'Parti'].includes(String(group.status || ''))) return group;
        const audit = Array.isArray(group.audit) ? group.audit : [];
        return {
          ...group,
          status: 'Arrivé',
          arrivalConfirmedAt: atLabel,
          arrivalConfirmedAtIso: atIso,
          arrivalConfirmedBy: actorName,
          audit: [
            ...audit,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              action: `Arrivée confirmée par ${actorName} · ${atLabel}`,
              actor: actorName,
              role: actorRole,
              at: atLabel,
            },
          ],
        };
      });
      if (!found) throw new NotFoundException('Groupe introuvable.');

      const updated = await this.prisma.operationalStore.updateMany({
        where: { id: store.id, version: store.version },
        data: {
          payload: next as Prisma.InputJsonValue,
          updatedById: input.userId || undefined,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) continue;

      const saved = await this.prisma.operationalStore.findUnique({
        where: { id: store.id },
        select: { payload: true, version: true, updatedAt: true },
      });
      return { payload: saved?.payload ?? next, version: saved?.version ?? store.version + 1, updatedAt: saved?.updatedAt ?? new Date() };
    }

    throw new BadRequestException('Impossible de confirmer l’arrivée après plusieurs écritures concurrentes. Réessayez.');
  }

  private async resolveHotelId(hotelId?: string, userId?: string) {
    if (hotelId) return hotelId;
    if (!userId) throw new BadRequestException('Hôtel et utilisateur absents.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hotelId: true } });
    if (!user) throw new BadRequestException('Utilisateur introuvable.');
    return user.hotelId;
  }
}
