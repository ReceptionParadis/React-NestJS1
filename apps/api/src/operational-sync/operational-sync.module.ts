import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DailyDirectionReportService } from './daily-direction-report.service';
import { GroupStatusService } from './group-status.service';
import { OperationalSyncController } from './operational-sync.controller';
import { OperationalSyncService } from './operational-sync.service';

@Module({
  controllers: [OperationalSyncController],
  providers: [OperationalSyncService, DailyDirectionReportService, GroupStatusService, PrismaService],
  exports: [OperationalSyncService],
})
export class OperationalSyncModule {}
