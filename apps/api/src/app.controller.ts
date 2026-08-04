import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      service: 'hospicore-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
