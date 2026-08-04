import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AllocationModule } from './allocation/allocation.module';
import { GroupsModule } from './groups/groups.module';
import { RoomsModule } from './rooms/rooms.module';
import { ShiftLogModule } from './shift-log/shift-log.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'apps', 'web', 'dist'),
      exclude: ['/api*'],
    }),
    ShiftLogModule,
    RoomsModule,
    TicketsModule,
    GroupsModule,
    AllocationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
