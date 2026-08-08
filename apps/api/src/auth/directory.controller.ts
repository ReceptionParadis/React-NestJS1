import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class DirectoryController {
  constructor(private readonly auth:AuthService,private readonly prisma:PrismaService){}

  @Get('directory')
  async directory(@Headers('authorization') authorization?:string){
    const token=authorization?.replace(/^Bearer\s+/i,'').trim();
    if(!token)throw new UnauthorizedException('Authentification requise');
    const payload=this.auth.verifyToken(token);
    const actor=await this.prisma.user.findUnique({where:{id:payload.sub}});
    if(!actor||actor.status!=='ACTIVE')throw new UnauthorizedException('Session invalide');
    const users=await this.prisma.user.findMany({where:{hotelId:actor.hotelId,status:'ACTIVE'},include:{role:true},orderBy:[{lastName:'asc'},{firstName:'asc'}]});
    return users.filter(user=>!user.email.endsWith('@hospicore.invalid')).map(user=>{
      let roleLabel=user.role.name,baseRole='';
      try{const meta=JSON.parse(user.role.description||'{}');roleLabel=String(meta.label||user.role.name);baseRole=String(meta.baseRole||'');}catch{}
      return{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email,role:user.role.name,roleLabel,baseRole,status:'ACTIVE'};
    });
  }
}
