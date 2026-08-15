import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DailyDirectionReportService } from './daily-direction-report.service';
import { GroupStatusService } from './group-status.service';
import { OperationalSyncService } from './operational-sync.service';

@Controller('operational-sync')
export class OperationalSyncController {
  constructor(
    private readonly service: OperationalSyncService,
    private readonly directionReports: DailyDirectionReportService,
    private readonly groupStatus: GroupStatusService,
  ) {}

  @Get('diagnostic/status')
  diagnostic(@Query('hotelId') hotelId?: string, @Query('userId') userId?: string) {
    return this.service.diagnostic(hotelId, userId);
  }

  @Get('direction-report/ensure')
  ensureDirectionReport() {
    return this.directionReports.ensureDueReports();
  }

  @Put('group-360/:groupId/arrive')
  arriveGroup(
    @Param('groupId') groupId: string,
    @Body() body: { hotelId?: string; userId?: string; actorName?: string; actorRole?: string },
  ) {
    return this.groupStatus.arrive({ ...body, groupId });
  }

  @Get()
  list(@Query('hotelId') hotelId?: string, @Query('userId') userId?: string) {
    return this.service.list(hotelId, userId);
  }

  @Get(':namespace')
  get(
    @Param('namespace') namespace: string,
    @Query('hotelId') hotelId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.get(hotelId, namespace, userId);
  }

  @Put(':namespace')
  @Post(':namespace')
  save(
    @Param('namespace') namespace: string,
    @Body()
    body: {
      hotelId?: string;
      payload: Prisma.InputJsonValue;
      updatedById?: string;
      expectedVersion?: number;
    },
  ) {
    return this.service.save({ ...body, namespace });
  }
}
