import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotePriority, ShiftNoteStatus } from '@prisma/client';
import { ShiftLogService } from './shift-log.service';

@Controller('shift-notes')
export class ShiftLogController {
  constructor(private readonly shiftLogService: ShiftLogService) {}

  @Get()
  list(
    @Query('hotelId') hotelId: string,
    @Query('search') search?: string,
    @Query('priority') priority?: NotePriority,
    @Query('status') status?: ShiftNoteStatus,
  ) {
    return this.shiftLogService.list(hotelId, search, priority, status);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      content: string;
      category: string;
      service: string;
      priority?: NotePriority;
      hotelId: string;
      authorId: string;
    },
  ) {
    return this.shiftLogService.create(body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: ShiftNoteStatus) {
    return this.shiftLogService.updateStatus(id, status);
  }

  @Patch(':id/pin')
  togglePinned(@Param('id') id: string) {
    return this.shiftLogService.togglePinned(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() body: { content: string; authorId: string },
  ) {
    return this.shiftLogService.addComment(id, body);
  }
}
