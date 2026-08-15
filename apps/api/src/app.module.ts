import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AllocationModule } from './allocation/allocation.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { OperationalSyncModule } from './operational-sync/operational-sync.module';
import { RoomsModule } from './rooms/rooms.module';
import { ShiftLogModule } from './shift-log/shift-log.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      // Le processus Render est démarré depuis la racine du monorepo (/app).
      // Le build Vite se trouve donc dans /app/apps/web/dist.
      rootPath: join(process.cwd(), 'apps', 'web', 'dist'),
      exclude: ['/api/{*path}'],
    }),
    AuthModule,
    ShiftLogModule,
    RoomsModule,
    TicketsModule,
    GroupsModule,
    AllocationModule,
    OperationalSyncModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
