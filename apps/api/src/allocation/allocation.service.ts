import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus, RoomType, RoomingEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AllocationConflict = {
  entryId: string;
  guest: string;
  reason: string;
};

type AllocationProposal = {
  entryId: string;
  guest: string;
  roomId: string;
  roomNumber: string;
  score: number;
  reasons: string[];
};

@Injectable()
export class AllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async propose(groupId: string) {
    const group = await this.prisma.hotelGroup.findUnique({
      where: { id: groupId },
      include: { roomingList: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId: group.hotelId,
        status: { in: [RoomStatus.AVAILABLE, RoomStatus.INSPECTED] },
        OR: [
          { arrivalDate: null },
          { departureDate: { lte: group.arrivalDate } },
          { arrivalDate: { gte: group.departureDate } },
        ],
      },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });

    const available = new Map(rooms.map((room) => [room.id, room]));
    const proposals: AllocationProposal[] = [];
    const conflicts: AllocationConflict[] = [];

    const entries = [...group.roomingList].sort((a, b) => {
      const weight = (type: RoomType) => ({ QUADRUPLE: 5, TRIPLE: 4, TWIN: 3, DOUBLE: 3, SINGLE: 2 }[type]);
      return weight(b.roomType) - weight(a.roomType);
    });

    for (const entry of entries) {
      const guest = `${entry.firstName} ${entry.lastName}`.trim();
      const specialNeeds = entry.specialNeeds?.toLowerCase() ?? '';
      const candidates = [...available.values()]
        .map((room) => {
          let score = 0;
          const reasons: string[] = [];
          if (room.type === entry.roomType) { score += 50; reasons.push('type exact'); }
          else if (this.isCompatible(entry.roomType, room.type, room.capacity)) { score += 20; reasons.push('capacité compatible'); }
          else return null;

          if (entry.requestedRoom && room.number === entry.requestedRoom) { score += 100; reasons.push('chambre demandée'); }
          if (specialNeeds.includes('pmr') && /pmr/i.test(room.guestName ?? '')) { score += 80; reasons.push('besoin PMR'); }
          if (room.status === RoomStatus.INSPECTED) { score += 10; reasons.push('chambre contrôlée'); }
          score -= room.floor;
          return { room, score, reasons };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => b.score - a.score || a.room.number.localeCompare(b.room.number));

      const best = candidates[0];
      if (!best) {
        conflicts.push({ entryId: entry.id, guest, reason: `Aucune chambre ${entry.roomType.toLowerCase()} compatible disponible` });
        continue;
      }

      proposals.push({ entryId: entry.id, guest, roomId: best.room.id, roomNumber: best.room.number, score: best.score, reasons: best.reasons });
      available.delete(best.room.id);
    }

    return { groupId, generatedAt: new Date(), proposals, conflicts, summary: { allocated: proposals.length, conflicts: conflicts.length, total: entries.length } };
  }

  async apply(groupId: string, assignments: Array<{ entryId: string; roomId: string }>) {
    const group = await this.prisma.hotelGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (!assignments.length) throw new BadRequestException('Aucune attribution à appliquer');

    const uniqueRooms = new Set(assignments.map((item) => item.roomId));
    if (uniqueRooms.size !== assignments.length) throw new BadRequestException('Une chambre ne peut être attribuée qu’une seule fois');

    return this.prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        const entry = await tx.roomingListEntry.findFirst({ where: { id: assignment.entryId, groupId } });
        if (!entry) throw new BadRequestException(`Voyageur ${assignment.entryId} invalide`);
        const room = await tx.room.findFirst({ where: { id: assignment.roomId, hotelId: group.hotelId, status: { not: RoomStatus.OUT_OF_ORDER } } });
        if (!room) throw new BadRequestException(`Chambre ${assignment.roomId} indisponible`);

        await tx.roomingListEntry.update({
          where: { id: entry.id },
          data: { roomId: room.id, status: RoomingEntryStatus.ALLOCATED },
        });
        await tx.room.update({
          where: { id: room.id },
          data: { groupName: group.name, arrivalDate: group.arrivalDate, departureDate: group.departureDate },
        });
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
