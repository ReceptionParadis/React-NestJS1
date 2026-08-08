import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { DirectoryController } from './directory.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AuthController, DirectoryController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
