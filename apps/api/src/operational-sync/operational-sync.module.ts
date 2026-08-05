import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OperationalSyncController } from './operational-sync.controller';
import { OperationalSyncService } from './operational-sync.service';

@Module({
  controllers: [OperationalSyncController],
  providers: [OperationalSyncService, PrismaService],
})
export class OperationalSyncModule {}
