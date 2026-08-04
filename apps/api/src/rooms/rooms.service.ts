import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  list(hotelId: string, building?: string, floor?: number, status?: RoomStatus, search?: string) {
    return this.prisma.room.findMany({
      where: {
        hotelId,
        building,
        floor,
        status,
        OR: search
          ? [
              { number: { contains: search, mode: 'insensitive' } },
              { guestName: { contains: search, mode: 'insensitive' } },
              { groupName: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        tickets: {
          where: { closedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });
  }

  async get(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { tickets: { orderBy: { createdAt: 'desc' } } },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');
    return room;
  }

  async updateStatus(id: string, status: RoomStatus) {
    await this.get(id);
    return this.prisma.room.update({
      where: { id },
      data: {
        status,
        lastInspectedAt: status === RoomStatus.INSPECTED ? new Date() : undefined,
      },
    });
  }
}
