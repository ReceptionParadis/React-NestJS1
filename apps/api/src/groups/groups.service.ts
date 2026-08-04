import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupPaymentStatus, GroupStatus, Prisma, RoomType, RoomingEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type CreateGroupInput = {
  code: string;
  name: string;
  agency?: string;
  dmc?: string;
  leaderName?: string;
  leaderPhone?: string;
  language?: string;
  arrivalDate: string;
  departureDate: string;
  arrivalTime?: string;
  dinnerTime?: string;
  pax: number;
  roomCount: number;
  buses?: number;
  parkingReserved?: boolean;
  status?: GroupStatus;
  paymentStatus?: GroupPaymentStatus;
  notes?: string;
  hotelId: string;
};

type RoomingRow = {
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  roomType: RoomType;
  requestedRoom?: string;
  specialNeeds?: string;
  sourceRow?: number;
};

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(hotelId: string, search?: string, status?: GroupStatus) {
    return this.prisma.hotelGroup.findMany({
      where: {
        hotelId,
        status,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { agency: { contains: search, mode: 'insensitive' } },
              { leaderName: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        _count: { select: { roomingList: true, payments: true } },
      },
      orderBy: { arrivalDate: 'asc' },
    });
  }

  async get(id: string) {
    const group = await this.prisma.hotelGroup.findUnique({
      where: { id },
      include: {
        roomingList: { include: { room: true }, orderBy: [{ requestedRoom: 'asc' }, { lastName: 'asc' }] },
        payments: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');
    return group;
  }

  create(input: CreateGroupInput) {
    return this.prisma.hotelGroup.create({
      data: {
        ...input,
        arrivalDate: new Date(input.arrivalDate),
        departureDate: new Date(input.departureDate),
        buses: input.buses ?? 0,
        parkingReserved: input.parkingReserved ?? false,
        status: input.status ?? GroupStatus.PREPARATION,
        paymentStatus: input.paymentStatus ?? GroupPaymentStatus.PENDING,
      },
    });
  }

  async update(id: string, input: Partial<CreateGroupInput>) {
    await this.get(id);
    const data: Prisma.HotelGroupUpdateInput = { ...input };
    if (input.arrivalDate) data.arrivalDate = new Date(input.arrivalDate);
    if (input.departureDate) data.departureDate = new Date(input.departureDate);
    delete (data as Record<string, unknown>).hotelId;
    return this.prisma.hotelGroup.update({ where: { id }, data });
  }

  async importRoomingList(groupId: string, rows: RoomingRow[]) {
    await this.get(groupId);
    const data = rows.map((row) => ({
      groupId,
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      gender: row.gender?.trim() || null,
      birthDate: row.birthDate ? new Date(row.birthDate) : null,
      roomType: row.roomType,
      requestedRoom: row.requestedRoom?.trim() || null,
      specialNeeds: row.specialNeeds?.trim() || null,
      sourceRow: row.sourceRow,
      status: row.firstName && row.lastName ? RoomingEntryStatus.VALID : RoomingEntryStatus.ERROR,
    }));
    await this.prisma.roomingListEntry.deleteMany({ where: { groupId } });
    await this.prisma.roomingListEntry.createMany({ data });
    return this.get(groupId);
  }

  async addPayment(groupId: string, input: { label: string; amount: number; dueDate?: string; paidAt?: string; reference?: string }) {
    await this.get(groupId);
    return this.prisma.groupPayment.create({
      data: {
        groupId,
        label: input.label,
        amount: input.amount,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        reference: input.reference,
      },
    });
  }
}
