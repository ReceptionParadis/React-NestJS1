import { Body, Controller, Get, Param, Put } from '@nestjs/common';
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

  // Route de secours volontairement déclarée dans le contrôleur racine.
  // Elle garantit les écritures opérationnelles sur Render même si le
  // contrôleur dédié n'est pas monté correctement dans une image déployée.
  @Put('operational-sync/:namespace')
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
