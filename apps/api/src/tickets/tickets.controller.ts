import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotePriority, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(
    @Query('hotelId') hotelId: string,
    @Query('status') status?: TicketStatus,
    @Query('service') service?: string,
    @Query('search') search?: string,
  ) {
    return this.ticketsService.list(hotelId, status, service, search);
  }

  @Post()
  create(
    @Body()
    body: {
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
    },
  ) {
    return this.ticketsService.create(body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: TicketStatus; actorId: string }) {
    return this.ticketsService.updateStatus(id, body.status, body.actorId);
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() body: { assigneeId: string; actorId: string }) {
    return this.ticketsService.assign(id, body.assigneeId, body.actorId);
  }

  @Post(':id/comments')
  comment(@Param('id') id: string, @Body() body: { content: string; authorId: string }) {
    return this.ticketsService.addComment(id, body.content, body.authorId);
  }
}
