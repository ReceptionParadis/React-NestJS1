import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    return { setupRequired: (await this.prisma.user.count()) === 0 };
  }

  async setup(input: { firstName?: string; lastName?: string; email?: string; password?: string }) {
    if ((await this.prisma.user.count()) > 0) throw new UnauthorizedException('La configuration initiale est déjà terminée');
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password || input.password.length < 10) {
      throw new UnauthorizedException('Un e-mail et un mot de passe de 10 caractères minimum sont requis');
    }

    const hotel = await this.prisma.hotel.create({ data: { name: 'Hôtel Paradis', slug: 'hotel-paradis-lourdes' } });
    const role = await this.prisma.role.create({ data: { name: 'ADMIN', description: 'Administrateur HospiCore' } });
    const user = await this.prisma.user.create({
      data: {
        firstName: input.firstName?.trim() || 'Administrateur',
        lastName: input.lastName?.trim() || 'HospiCore',
        email,
        passwordHash: this.hashPassword(input.password),
        hotelId: hotel.id,
        roleId: role.id,
      },
      include: { role: true, hotel: true },
    });
    return this.session(user);
  }

  async login(input: { email?: string; password?: string }) {
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) throw new UnauthorizedException('Identifiants invalides');
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true, hotel: true } });
    if (!user || !this.verifyPassword(input.password, user.passwordHash)) throw new UnauthorizedException('Identifiants invalides');
    return this.session(user);
  }

  verifyToken(token: string) {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Session invalide');
    const expected = this.sign(payload);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new UnauthorizedException('Session invalide');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number; email: string; role: string };
    if (data.exp < Date.now()) throw new UnauthorizedException('Session expirée');
    return data;
  }

  private session(user: { id: string; firstName: string; lastName: string; email: string; role: { name: string }; hotel: { id: string; name: string } }) {
    const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, role: user.role.name, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
    return {
      token: `${payload}.${this.sign(payload)}`,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role.name, hotel: user.hotel },
    };
  }

  private sign(payload: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET manquant');
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
  }
}
