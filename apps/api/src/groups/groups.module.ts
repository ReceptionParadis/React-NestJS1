import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, PrismaService],
})
export class GroupsModule {}
