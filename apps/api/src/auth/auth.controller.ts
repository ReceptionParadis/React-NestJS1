import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('status')
  status() {
    return this.auth.status();
  }

  @Post('setup')
  setup(@Body() body: { firstName?: string; lastName?: string; email?: string; password?: string }) {
    return this.auth.setup(body);
  }

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login(body);
  }
}
