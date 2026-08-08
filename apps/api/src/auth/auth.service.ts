import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';

const ADMIN_ROLES = ['ADMIN', 'ADMINISTRATEUR', 'DIRECTEUR GENERAL', 'DIRECTEUR HEBERGEMENT'];
const MANAGED_ROLES = [
  { name: 'ADMIN', label: 'Administrateur', description: 'Accès complet à HospiCore' },
  { name: 'DIRECTEUR GENERAL', label: 'Directeur Général', description: 'Accès Direction à tous les modules métier' },
  { name: 'DIRECTEUR HEBERGEMENT', label: 'Directeur Hébergement', description: 'Direction Hébergement et supervision opérationnelle' },
  { name: 'CHEF DE RECEPTION', label: 'Chef de Réception', description: 'Pilotage Réception et contrôles Groupe' },
  { name: 'RECEPTIONNISTE', label: 'Réceptionniste', description: 'Exploitation quotidienne de la Réception' },
  { name: 'COMMERCIAL', label: 'Commercial', description: 'Fiches Groupe, validation et suivi de facturation' },
  { name: 'TECHNICIEN', label: 'Technicien Maintenance', description: 'Interventions et suivi Maintenance' },
] as const;

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
    if (!user || user.status !== 'ACTIVE' || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Identifiants invalides ou compte suspendu');
    }
    return this.session(user);
  }

  async adminUsers(authorization?: string) {
    const actor = await this.requireAdmin(authorization);
    const users = await this.prisma.user.findMany({
      where: { hotelId: actor.hotelId },
      include: { role: true },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      role: user.role.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async adminRoles(authorization?: string) {
    await this.requireAdmin(authorization);
    await this.ensureManagedRoles();
    return MANAGED_ROLES;
  }

  async createUser(
    authorization: string | undefined,
    input: { firstName?: string; lastName?: string; email?: string; password?: string; role?: string },
  ) {
    const actor = await this.requireAdmin(authorization);
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password || '';
    const roleName = this.validRole(input.role);
    if (!firstName || !lastName || !email || password.length < 10) {
      throw new UnauthorizedException('Prénom, nom, e-mail et mot de passe de 10 caractères minimum sont requis');
    }
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    const role = await this.prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: MANAGED_ROLES.find(r => r.name === roleName)?.description },
    });
    const user = await this.prisma.user.create({
      data: { firstName, lastName, email, passwordHash: this.hashPassword(password), hotelId: actor.hotelId, roleId: role.id, status: 'ACTIVE' },
      include: { role: true },
    });
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, status: user.status, role: user.role.name, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }

  async updateUser(
    authorization: string | undefined,
    id: string,
    input: { firstName?: string; lastName?: string; email?: string; role?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    const actor = await this.requireAdmin(authorization);
    const target = await this.prisma.user.findFirst({ where: { id, hotelId: actor.hotelId }, include: { role: true } });
    if (!target) throw new UnauthorizedException('Utilisateur introuvable');
    if (target.id === actor.id && input.status === 'INACTIVE') throw new UnauthorizedException('Vous ne pouvez pas suspendre votre propre compte');
    const roleName = input.role ? this.validRole(input.role) : target.role.name;
    const role = await this.prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: MANAGED_ROLES.find(r => r.name === roleName)?.description } });
    const email = input.email?.trim().toLowerCase();
    if (email && email !== target.email) {
      const duplicate = await this.prisma.user.findUnique({ where: { email } });
      if (duplicate) throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName?.trim() || target.firstName,
        lastName: input.lastName?.trim() || target.lastName,
        email: email || target.email,
        roleId: role.id,
        status: input.status || target.status,
      },
      include: { role: true },
    });
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, status: user.status, role: user.role.name, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }

  async resetPassword(authorization: string | undefined, id: string, password?: string) {
    const actor = await this.requireAdmin(authorization);
    if (!password || password.length < 10) throw new UnauthorizedException('Le nouveau mot de passe doit comporter au moins 10 caractères');
    const target = await this.prisma.user.findFirst({ where: { id, hotelId: actor.hotelId } });
    if (!target) throw new UnauthorizedException('Utilisateur introuvable');
    await this.prisma.user.update({ where: { id }, data: { passwordHash: this.hashPassword(password) } });
    return { ok: true };
  }

  verifyToken(token: string) {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Session invalide');
    const expected = this.sign(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) throw new UnauthorizedException('Session invalide');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number; email: string; role: string };
    if (data.exp < Date.now()) throw new UnauthorizedException('Session expirée');
    return data;
  }

  private async requireAdmin(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Authentification requise');
    const payload = this.verifyToken(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || user.status !== 'ACTIVE' || !ADMIN_ROLES.includes(user.role.name.toUpperCase())) throw new UnauthorizedException('Accès administrateur requis');
    return user;
  }

  private validRole(value?: string) {
    const role = String(value || '').trim().toUpperCase();
    if (!MANAGED_ROLES.some(item => item.name === role)) throw new UnauthorizedException('Rôle HospiCore invalide');
    return role;
  }

  private async ensureManagedRoles() {
    for (const role of MANAGED_ROLES) {
      await this.prisma.role.upsert({ where: { name: role.name }, update: { description: role.description }, create: { name: role.name, description: role.description } });
    }
  }

  private session(user: { id: string; firstName: string; lastName: string; email: string; role: { name: string }; hotel: { id: string; name: string } }) {
    const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, role: user.role.name, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
    return {
      token: `${payload}.${this.sign(payload)}`,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role.name, hotelId: user.hotel.id, hotel: user.hotel },
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
    const storedBuffer = Buffer.from(hash, 'hex');
    const candidate = scryptSync(password, salt, 64);
    return storedBuffer.length === candidate.length && timingSafeEqual(storedBuffer, candidate);
  }
}
