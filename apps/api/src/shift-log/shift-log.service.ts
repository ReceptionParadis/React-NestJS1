import { Injectable, NotFoundException } from '@nestjs/common';
import { NotePriority, ShiftNoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type CreateShiftNoteInput = {
  title: string;
  content: string;
  category: string;
  service: string;
  priority?: NotePriority;
  hotelId: string;
  authorId: string;
};

type AddCommentInput = {
  content: string;
  authorId: string;
};

@Injectable()
export class ShiftLogService {
  constructor(private readonly prisma: PrismaService) {}

  list(hotelId: string, search?: string, priority?: NotePriority, status?: ShiftNoteStatus) {
    return this.prisma.shiftNote.findMany({
      where: {
        hotelId,
        priority,
        status,
        OR: search
          ? [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(input: CreateShiftNoteInput) {
    return this.prisma.shiftNote.create({
      data: {
        ...input,
        priority: input.priority ?? NotePriority.NORMAL,
      },
      include: { author: true, comments: true },
    });
  }

  async updateStatus(id: string, status: ShiftNoteStatus) {
    await this.ensureExists(id);
    return this.prisma.shiftNote.update({ where: { id }, data: { status } });
  }

  async togglePinned(id: string) {
    const note = await this.ensureExists(id);
    return this.prisma.shiftNote.update({ where: { id }, data: { pinned: !note.pinned } });
  }

  async addComment(noteId: string, input: AddCommentInput) {
    await this.ensureExists(noteId);
    return this.prisma.shiftNoteComment.create({
      data: { noteId, content: input.content, authorId: input.authorId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  private async ensureExists(id: string) {
    const note = await this.prisma.shiftNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Transmission introuvable');
    return note;
  }
}
