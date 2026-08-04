import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShiftLogController } from './shift-log.controller';
import { ShiftLogService } from './shift-log.service';

@Module({
  controllers: [ShiftLogController],
  providers: [ShiftLogService, PrismaService],
})
export class ShiftLogModule {}
