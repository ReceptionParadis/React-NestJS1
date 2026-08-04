import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list(
    @Query('hotelId') hotelId: string,
    @Query('building') building?: string,
    @Query('floor') floor?: string,
    @Query('status') status?: RoomStatus,
    @Query('search') search?: string,
  ) {
    return this.rooms.list(hotelId, building, floor ? Number(floor) : undefined, status, search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.rooms.get(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: RoomStatus }) {
    return this.rooms.updateStatus(id, body.status);
  }
}
