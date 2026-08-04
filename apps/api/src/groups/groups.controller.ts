import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GroupStatus } from '@prisma/client';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@Query('hotelId') hotelId: string, @Query('search') search?: string, @Query('status') status?: GroupStatus) {
    return this.groups.list(hotelId, search, status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.groups.get(id);
  }

  @Post()
  create(@Body() body: Parameters<GroupsService['create']>[0]) {
    return this.groups.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Parameters<GroupsService['update']>[1]) {
    return this.groups.update(id, body);
  }

  @Post(':id/rooming-list/import')
  importRoomingList(@Param('id') id: string, @Body() body: { rows: Parameters<GroupsService['importRoomingList']>[1] }) {
    return this.groups.importRoomingList(id, body.rows);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() body: Parameters<GroupsService['addPayment']>[1]) {
    return this.groups.addPayment(id, body);
  }
}
