import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OperationalSyncService } from './operational-sync/operational-sync.service';

@Controller()
export class AppController {
  constructor(private readonly operationalSync: OperationalSyncService) {}

  @Get('health')
  health() {
    return {
      service: 'hospicore-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // Routes de secours déclarées dans le contrôleur racine.
  // Elles garantissent la lecture et l'écriture des données opérationnelles
  // sur Render même si le contrôleur dédié n'est pas monté correctement.
  @Get('operational-sync/:namespace')
  getOperationalStore(
    @Param('namespace') namespace: string,
    @Query('hotelId') hotelId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.operationalSync.get(hotelId, namespace, userId);
  }

  @Put('operational-sync/:namespace')
  @Post('operational-sync/:namespace')
  saveOperationalStore(
    @Param('namespace') namespace: string,
    @Body()
    body: {
      hotelId?: string;
      payload: Prisma.InputJsonValue;
      updatedById?: string;
      expectedVersion?: number;
    },
  ) {
    return this.operationalSync.save({ ...body, namespace });
  }
}
