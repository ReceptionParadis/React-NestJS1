import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DailyDirectionReportService } from './daily-direction-report.service';
import { OperationalSyncService } from './operational-sync.service';

@Controller('operational-sync')
export class OperationalSyncController {
  constructor(
    private readonly service: OperationalSyncService,
    private readonly directionReports: DailyDirectionReportService,
  ) {}

  @Get('diagnostic/status')
  diagnostic(@Query('hotelId') hotelId?: string, @Query('userId') userId?: string) {
    return this.service.diagnostic(hotelId, userId);
  }

  @Get('direction-report/ensure')
  ensureDirectionReport() {
    return this.directionReports.ensureDueReports();
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
