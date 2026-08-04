import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus, RoomType, RoomingEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AllocationConflict = { entryId: string; guestName: string; requestedType: RoomType; reason: string };
type AllocationProposal = {
  entryId: string;
  guestName: string;
  requestedType: RoomType;
  specialNeeds?: string;
  requiresAccessible: boolean;
  connectingRequest?: string;
  preferredFloor?: number;
  preferredBuilding?: string;
  room: { id: string; number: string; type: RoomType; capacity: number; floor: number; building: string; accessible: boolean; connectingGroup: string | null };
  score: number;
  reasons: string[];
};

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async propose(groupId: string) {
    const group = await this.prisma.hotelGroup.findUnique({ where: { id: groupId }, include: { roomingList: true } });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId: group.hotelId,
        status: { in: [RoomStatus.AVAILABLE, RoomStatus.INSPECTED] },
        OR: [{ arrivalDate: null }, { departureDate: { lte: group.arrivalDate } }, { arrivalDate: { gte: group.departureDate } }],
      },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });

    const available = new Map(rooms.map((room) => [room.id, room]));
    const connectingSelections = new Map<string, string>();
    const assignments: AllocationProposal[] = [];
    const conflicts: AllocationConflict[] = [];

    const entries = [...group.roomingList].sort((a, b) => {
      const weight = (entry: typeof a) => (entry.requiresAccessible ? 100 : 0) + (entry.connectingRequest ? 50 : 0) + ({ QUADRUPLE: 5, TRIPLE: 4, TWIN: 3, DOUBLE: 3, SINGLE: 2 }[entry.roomType]);
      return weight(b) - weight(a);
    });

    for (const entry of entries) {
      const guestName = `${entry.firstName} ${entry.lastName}`.trim();
      const candidates = [...available.values()].map((room) => {
        if (entry.requiresAccessible && !room.accessible) return null;
        if (!this.isCompatible(entry.roomType, room.type, room.capacity)) return null;

        let score = room.type === entry.roomType ? 50 : 20;
        const reasons = [room.type === entry.roomType ? 'Type exact' : 'Capacité compatible'];
        if (entry.requestedRoom && room.number === entry.requestedRoom) { score += 100; reasons.push('Chambre demandée'); }
        if (entry.requiresAccessible && room.accessible) { score += 120; reasons.push('Chambre PMR obligatoire'); }
        else if (room.accessible) { score -= 20; reasons.push('Chambre PMR préservée'); }
        if (entry.preferredBuilding && room.building === entry.preferredBuilding) { score += 35; reasons.push(`Bâtiment ${room.building} préféré`); }
        if (entry.preferredFloor !== null && entry.preferredFloor !== undefined) {
          const distance = Math.abs(room.floor - entry.preferredFloor);
          score += Math.max(0, 30 - distance * 10);
          reasons.push(distance === 0 ? 'Étage préféré' : `À ${distance} étage(s) de la préférence`);
        }
        if (entry.connectingRequest) {
          const selectedGroup = connectingSelections.get(entry.connectingRequest);
          if (selectedGroup && room.connectingGroup !== selectedGroup) return null;
          if (!selectedGroup && !room.connectingGroup) return null;
          score += 80;
          reasons.push('Chambre communicante');
        }
        if (room.preferredForGroups) { score += 15; reasons.push('Chambre privilégiée groupes'); }
        if (room.status === RoomStatus.INSPECTED) { score += 10; reasons.push('Chambre contrôlée'); }
        score -= room.floor;
        return { room, score, reasons };
      }).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.score - a.score || a.room.number.localeCompare(b.room.number));

      const best = candidates[0];
      if (!best) {
        const constraints = [entry.requiresAccessible ? 'PMR' : null, entry.connectingRequest ? 'communicante' : null, entry.preferredFloor !== null && entry.preferredFloor !== undefined ? `étage ${entry.preferredFloor}` : null].filter(Boolean).join(', ');
        conflicts.push({ entryId: entry.id, guestName, requestedType: entry.roomType, reason: `Aucune chambre ${entry.roomType.toLowerCase()} compatible${constraints ? ` (${constraints})` : ''} disponible` });
        continue;
      }

      if (entry.connectingRequest && best.room.connectingGroup) connectingSelections.set(entry.connectingRequest, best.room.connectingGroup);
      assignments.push({
        entryId: entry.id,
        guestName,
        requestedType: entry.roomType,
        specialNeeds: entry.specialNeeds ?? undefined,
        requiresAccessible: entry.requiresAccessible,
        connectingRequest: entry.connectingRequest ?? undefined,
        preferredFloor: entry.preferredFloor ?? undefined,
        preferredBuilding: entry.preferredBuilding ?? undefined,
        room: { id: best.room.id, number: best.room.number, type: best.room.type, capacity: best.room.capacity, floor: best.room.floor, building: best.room.building, accessible: best.room.accessible, connectingGroup: best.room.connectingGroup },
        score: best.score,
        reasons: best.reasons,
      });
      available.delete(best.room.id);
    }

    return {
      groupId,
      generatedAt: new Date(),
      assignments,
      conflicts,
      availableRooms: rooms.map((room) => ({ id: room.id, number: room.number, type: room.type, capacity: room.capacity, floor: room.floor, building: room.building, accessible: room.accessible, connectingGroup: room.connectingGroup })),
      summary: { allocated: assignments.length, conflicts: conflicts.length, total: entries.length },
    };
  }

  async apply(groupId: string, assignments: Array<{ entryId: string; roomId: string }>) {
    const group = await this.prisma.hotelGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (!assignments.length) throw new BadRequestException('Aucune attribution à appliquer');
    if (new Set(assignments.map((item) => item.roomId)).size !== assignments.length) throw new BadRequestException('Une chambre ne peut être attribuée qu’une seule fois');

    return this.prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        const entry = await tx.roomingListEntry.findFirst({ where: { id: assignment.entryId, groupId } });
        if (!entry) throw new BadRequestException(`Voyageur ${assignment.entryId} invalide`);
        const room = await tx.room.findFirst({ where: { id: assignment.roomId, hotelId: group.hotelId, status: { not: RoomStatus.OUT_OF_ORDER } } });
        if (!room) throw new BadRequestException(`Chambre ${assignment.roomId} indisponible`);
        if (!this.isCompatible(entry.roomType, room.type, room.capacity)) throw new BadRequestException(`Chambre ${room.number} incompatible avec ${entry.roomType}`);
        if (entry.requiresAccessible && !room.accessible) throw new BadRequestException(`La chambre ${room.number} n’est pas PMR`);
        if (entry.connectingRequest && !room.connectingGroup) throw new BadRequestException(`La chambre ${room.number} n’est pas communicante`);
        await tx.roomingListEntry.update({ where: { id: entry.id }, data: { roomId: room.id, status: RoomingEntryStatus.ALLOCATED } });
        await tx.room.update({ where: { id: room.id }, data: { groupName: group.name, arrivalDate: group.arrivalDate, departureDate: group.departureDate } });
      }
      return tx.hotelGroup.findUnique({ where: { id: groupId }, include: { roomingList: { include: { room: true } } } });
    });
  }

  private isCompatible(requested: RoomType, actual: RoomType, capacity: number) {
    const required = { SINGLE: 1, DOUBLE: 2, TWIN: 2, TRIPLE: 3, QUADRUPLE: 4 }[requested];
    if (capacity < required) return false;
    if (requested === RoomType.TWIN && actual === RoomType.DOUBLE) return false;
    if (requested === RoomType.DOUBLE && actual === RoomType.TWIN) return false;
    return true;
  }
}
