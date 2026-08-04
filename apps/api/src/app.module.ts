import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ShiftLogModule } from './shift-log/shift-log.module';

@Module({
  imports: [ShiftLogModule],
  controllers: [AppController],
})
export class AppModule {}
