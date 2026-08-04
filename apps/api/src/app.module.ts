import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomsModule } from './rooms/rooms.module';
import { ShiftLogModule } from './shift-log/shift-log.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [ShiftLogModule, RoomsModule, TicketsModule],
  controllers: [AppController],
})
export class AppModule {}
