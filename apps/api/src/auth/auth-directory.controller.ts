import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

@Controller('auth')
export class AuthDirectoryController {
  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}

  @Get('directory')
  async directory(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Authentification requise');
    const payload = this.auth.verifyToken(token);
    const actor = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { hotelId: true, status: true } });
    if (!actor || actor.status !== 'ACTIVE') throw new UnauthorizedException('Session invalide');
    const users = await this.prisma.user.findMany({
      where: { hotelId: actor.hotelId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true, description: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map(user => {
      let label = user.role.name;
      let baseRole = '';
      try {
        const meta = JSON.parse(user.role.description || '{}');
        label = String(meta.label || user.role.name);
        baseRole = String(meta.baseRole || '');
      } catch {}
      return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role.name, roleLabel: label, baseRole, status: 'ACTIVE' };
    });
  }
}
