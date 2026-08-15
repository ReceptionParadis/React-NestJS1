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
      // app.module.js est compilé dans /app/apps/api/dist.
      // On remonte vers /app/apps puis on cible le build Vite /web/dist.
      // Ce calcul ne dépend plus de process.cwd() ni de la commande de démarrage Render.
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
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
