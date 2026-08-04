import { Injectable, NotFoundException } from '@nestjs/common';
import { NotePriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type CreateTicketInput = {
  title: string;
  description: string;
  service: string;
  location?: string;
  priority?: NotePriority;
  hotelId: string;
  roomId?: string;
  createdById: string;
  assigneeId?: string;
  dueAt?: string;
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  list(hotelId: string, status?: TicketStatus, service?: string, search?: string) {
    return this.prisma.ticket.findMany({
      where: {
        hotelId,
        status,
        service,
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { room: { number: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        room: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(input: CreateTicketInput) {
    const count = await this.prisma.ticket.count({ where: { hotelId: input.hotelId } });
    const reference = `HC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.ticket.create({
      data: {
        reference,
        title: input.title,
        description: input.description,
        service: input.service,
        location: input.location,
        priority: input.priority ?? NotePriority.NORMAL,
        hotelId: input.hotelId,
        roomId: input.roomId,
        createdById: input.createdById,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        status: input.assigneeId ? TicketStatus.ASSIGNED : TicketStatus.NEW,
        events: {
          create: {
            type: 'CREATED',
            message: 'Ticket créé',
            actorId: input.createdById,
          },
        },
      },
      include: { room: true, assignee: true, createdBy: true, comments: true, events: true },
    });
  }

  async updateStatus(id: string, status: TicketStatus, actorId: string) {
    await this.ensureExists(id);
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === TicketStatus.RESOLVED ? new Date() : undefined,
        closedAt: status === TicketStatus.CLOSED ? new Date() : undefined,
        events: { create: { type: 'STATUS_CHANGED', message: `Statut modifié : ${status}`, actorId } },
      },
      include: { room: true, assignee: true, comments: true, events: true },
    });
  }

  async assign(id: string, assigneeId: string, actorId: string) {
    await this.ensureExists(id);
    return this.prisma.ticket.update({
      where: { id },
      data: {
        assigneeId,
        status: TicketStatus.ASSIGNED,
        events: { create: { type: 'ASSIGNED', message: 'Ticket affecté', actorId } },
      },
      include: { assignee: true, room: true, comments: true, events: true },
    });
  }

  async addComment(id: string, content: string, authorId: string) {
    await this.ensureExists(id);
    return this.prisma.ticketComment.create({
      data: { ticketId: id, content, authorId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  private async ensureExists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    return ticket;
  }
}
