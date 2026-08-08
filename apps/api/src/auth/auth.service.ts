import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';

const ADMIN_ROLES = ['ADMIN', 'ADMINISTRATEUR', 'DIRECTEUR GENERAL', 'DIRECTEUR HEBERGEMENT'];
const BASE_ROLES = ['direction','reception_manager','reception','commercial','maintenance'] as const;
type BaseRole=(typeof BASE_ROLES)[number];
type ProfileMeta={label:string;description:string;baseRole:BaseRole;custom?:boolean};
const MANAGED_ROLES = [
  { name:'ADMIN',label:'Administrateur',description:'Accès complet à HospiCore',baseRole:'direction' as BaseRole },
  { name:'DIRECTEUR GENERAL',label:'Directeur Général',description:'Accès Direction à tous les modules métier',baseRole:'direction' as BaseRole },
  { name:'DIRECTEUR HEBERGEMENT',label:'Directeur Hébergement',description:'Direction Hébergement et supervision opérationnelle',baseRole:'direction' as BaseRole },
  { name:'CHEF DE RECEPTION',label:'Chef de Réception',description:'Pilotage Réception et contrôles Groupe',baseRole:'reception_manager' as BaseRole },
  { name:'RECEPTIONNISTE',label:'Réceptionniste',description:'Exploitation quotidienne de la Réception',baseRole:'reception' as BaseRole },
  { name:'COMMERCIAL',label:'Commercial',description:'Fiches Groupe, validation et suivi de facturation',baseRole:'commercial' as BaseRole },
  { name:'TECHNICIEN',label:'Technicien Maintenance',description:'Interventions et suivi Maintenance',baseRole:'maintenance' as BaseRole },
] as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async status(){return{setupRequired:(await this.prisma.user.count())===0}}

  async setup(input:{firstName?:string;lastName?:string;email?:string;password?:string}){
    if((await this.prisma.user.count())>0)throw new UnauthorizedException('La configuration initiale est déjà terminée');
    const email=input.email?.trim().toLowerCase();
    if(!email||!input.password||input.password.length<10)throw new UnauthorizedException('Un e-mail et un mot de passe de 10 caractères minimum sont requis');
    const hotel=await this.prisma.hotel.create({data:{name:'Hôtel Paradis',slug:'hotel-paradis-lourdes'}});
    const admin=MANAGED_ROLES[0];
    const role=await this.prisma.role.create({data:{name:admin.name,description:this.encodeMeta(admin)}});
    const user=await this.prisma.user.create({data:{firstName:input.firstName?.trim()||'Administrateur',lastName:input.lastName?.trim()||'HospiCore',email,passwordHash:this.hashPassword(input.password),hotelId:hotel.id,roleId:role.id},include:{role:true,hotel:true}});
    await this.ensureManagedRoles();
    return this.session(user);
  }

  async login(input:{email?:string;password?:string}){
    const email=input.email?.trim().toLowerCase();
    if(!email||!input.password)throw new UnauthorizedException('Identifiants invalides');
    const user=await this.prisma.user.findUnique({where:{email},include:{role:true,hotel:true}});
    if(!user||user.status!=='ACTIVE'||!this.verifyPassword(input.password,user.passwordHash))throw new UnauthorizedException('Identifiants invalides ou compte suspendu');
    return this.session(user);
  }

  async adminUsers(authorization?:string){
    const actor=await this.requireAdmin(authorization);
    const users=await this.prisma.user.findMany({where:{hotelId:actor.hotelId},include:{role:true},orderBy:[{status:'asc'},{lastName:'asc'},{firstName:'asc'}]});
    return users.map(user=>({id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,status:user.status,role:user.role.name,roleLabel:this.roleMeta(user.role).label,createdAt:user.createdAt,updatedAt:user.updatedAt}));
  }

  async adminRoles(authorization?:string){
    await this.requireAdmin(authorization);await this.ensureManagedRoles();
    const roles=await this.prisma.role.findMany({orderBy:{name:'asc'}});
    return roles.map(role=>({id:role.id,name:role.name,...this.roleMeta(role)}));
  }

  async createRole(authorization:string|undefined,input:{label?:string;description?:string;baseRole?:string}){
    await this.requireAdmin(authorization);
    const label=String(input.label||'').trim(),description=String(input.description||'').trim(),baseRole=this.validBaseRole(input.baseRole);
    if(label.length<2)throw new UnauthorizedException('Le nom du profil est requis');
    const slug=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
    const name=`PROFIL_${slug}`;
    if(await this.prisma.role.findUnique({where:{name}}))throw new ConflictException('Un profil portant ce nom existe déjà');
    const meta:ProfileMeta={label,description:description||`Profil personnalisé ${label}`,baseRole,custom:true};
    const role=await this.prisma.role.create({data:{name,description:this.encodeMeta(meta)}});
    return{id:role.id,name:role.name,...meta};
  }

  async createUser(authorization:string|undefined,input:{firstName?:string;lastName?:string;email?:string;password?:string;role?:string}){
    const actor=await this.requireAdmin(authorization),firstName=input.firstName?.trim(),lastName=input.lastName?.trim(),email=input.email?.trim().toLowerCase(),password=input.password||'';
    if(!firstName||!lastName||!email||password.length<10)throw new UnauthorizedException('Prénom, nom, e-mail et mot de passe de 10 caractères minimum sont requis');
    if(await this.prisma.user.findUnique({where:{email}}))throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    const role=await this.resolveRole(input.role);
    const user=await this.prisma.user.create({data:{firstName,lastName,email,passwordHash:this.hashPassword(password),hotelId:actor.hotelId,roleId:role.id,status:'ACTIVE'},include:{role:true}});
    return{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,status:user.status,role:user.role.name,roleLabel:this.roleMeta(user.role).label,createdAt:user.createdAt,updatedAt:user.updatedAt};
  }

  async updateUser(authorization:string|undefined,id:string,input:{firstName?:string;lastName?:string;email?:string;role?:string;status?:'ACTIVE'|'INACTIVE'}){
    const actor=await this.requireAdmin(authorization),target=await this.prisma.user.findFirst({where:{id,hotelId:actor.hotelId},include:{role:true}});
    if(!target)throw new UnauthorizedException('Utilisateur introuvable');
    if(target.id===actor.id&&input.status==='INACTIVE')throw new UnauthorizedException('Vous ne pouvez pas suspendre votre propre compte');
    const role=input.role?await this.resolveRole(input.role):target.role;
    const email=input.email?.trim().toLowerCase();
    if(email&&email!==target.email&&await this.prisma.user.findUnique({where:{email}}))throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    const user=await this.prisma.user.update({where:{id},data:{firstName:input.firstName?.trim()||target.firstName,lastName:input.lastName?.trim()||target.lastName,email:email||target.email,roleId:role.id,status:input.status||target.status},include:{role:true}});
    return{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,status:user.status,role:user.role.name,roleLabel:this.roleMeta(user.role).label,createdAt:user.createdAt,updatedAt:user.updatedAt};
  }

  async resetPassword(authorization:string|undefined,id:string,password?:string){const actor=await this.requireAdmin(authorization);if(!password||password.length<10)throw new UnauthorizedException('Le nouveau mot de passe doit comporter au moins 10 caractères');const target=await this.prisma.user.findFirst({where:{id,hotelId:actor.hotelId}});if(!target)throw new UnauthorizedException('Utilisateur introuvable');await this.prisma.user.update({where:{id},data:{passwordHash:this.hashPassword(password)}});return{ok:true}}

  verifyToken(token:string){const[payload,signature]=token.split('.');if(!payload||!signature)throw new UnauthorizedException('Session invalide');const expected=this.sign(payload),signatureBuffer=Buffer.from(signature),expectedBuffer=Buffer.from(expected);if(signatureBuffer.length!==expectedBuffer.length||!timingSafeEqual(signatureBuffer,expectedBuffer))throw new UnauthorizedException('Session invalide');const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as{sub:string;exp:number;email:string;role:string};if(data.exp<Date.now())throw new UnauthorizedException('Session expirée');return data}

  private async requireAdmin(authorization?:string){const token=authorization?.replace(/^Bearer\s+/i,'').trim();if(!token)throw new UnauthorizedException('Authentification requise');const payload=this.verifyToken(token);const user=await this.prisma.user.findUnique({where:{id:payload.sub},include:{role:true}});if(!user||user.status!=='ACTIVE')throw new UnauthorizedException('Accès administrateur requis');const meta=this.roleMeta(user.role);if(!ADMIN_ROLES.includes(user.role.name.toUpperCase())&&meta.baseRole!=='direction')throw new UnauthorizedException('Accès administrateur requis');return user}
  private validBaseRole(value?:string):BaseRole{const role=String(value||'').trim() as BaseRole;if(!BASE_ROLES.includes(role))throw new UnauthorizedException('Profil de droits invalide');return role}
  private async resolveRole(value?:string){const name=String(value||'').trim().toUpperCase();if(!name)throw new UnauthorizedException('Profil utilisateur requis');await this.ensureManagedRoles();const role=await this.prisma.role.findUnique({where:{name}});if(!role)throw new UnauthorizedException('Profil HospiCore invalide');return role}
  private async ensureManagedRoles(){for(const role of MANAGED_ROLES)await this.prisma.role.upsert({where:{name:role.name},update:{description:this.encodeMeta(role)},create:{name:role.name,description:this.encodeMeta(role)}})}
  private encodeMeta(meta:{label:string;description:string;baseRole:BaseRole;custom?:boolean}){return JSON.stringify({label:meta.label,description:meta.description,baseRole:meta.baseRole,custom:Boolean(meta.custom)})}
  private roleMeta(role:{name:string;description:string|null}):ProfileMeta{try{const parsed=JSON.parse(role.description||'{}');if(parsed?.label&&BASE_ROLES.includes(parsed.baseRole))return{label:String(parsed.label),description:String(parsed.description||''),baseRole:parsed.baseRole,custom:Boolean(parsed.custom)}}catch{}const preset=MANAGED_ROLES.find(item=>item.name===role.name);return preset?{label:preset.label,description:preset.description,baseRole:preset.baseRole}:{label:role.name,description:role.description||'',baseRole:'reception',custom:true}}
  private session(user:{id:string;firstName:string;lastName:string;email:string;role:{name:string;description:string|null};hotel:{id:string;name:string}}){const meta=this.roleMeta(user.role);const payload=Buffer.from(JSON.stringify({sub:user.id,email:user.email,role:user.role.name,exp:Date.now()+12*60*60*1000})).toString('base64url');return{token:`${payload}.${this.sign(payload)}`,user:{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,role:{name:user.role.name,label:meta.label,baseRole:meta.baseRole},hotelId:user.hotel.id,hotel:user.hotel}}}
  private sign(payload:string){const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET manquant');return createHmac('sha256',secret).update(payload).digest('base64url')}
  private hashPassword(password:string){const salt=randomBytes(16).toString('hex');return`${salt}:${scryptSync(password,salt,64).toString('hex')}`}
  private verifyPassword(password:string,stored:string){const[salt,hash]=stored.split(':');if(!salt||!hash)return false;const storedBuffer=Buffer.from(hash,'hex'),candidate=scryptSync(password,salt,64);return storedBuffer.length===candidate.length&&timingSafeEqual(storedBuffer,candidate)}
}
