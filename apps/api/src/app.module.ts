import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomsModule } from './rooms/rooms.module';
import { ShiftLogModule } from './shift-log/shift-log.module';

@Module({
  imports: [ShiftLogModule, RoomsModule],
  controllers: [AppController],
})
export class AppModule {}
