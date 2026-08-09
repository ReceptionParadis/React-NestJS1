import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

const NIGHT_AUDITOR_PERMISSIONS=['dashboard.view','tasks.view','tasks.edit','instructions.view'];
function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function isNightAuditorRole(role:any){const raw=normalize(String(typeof role==='object'?(role?.baseRole||role?.name||role?.label||''):role||''));return raw==='night_auditor'||raw.includes('veilleur')||raw.includes('night auditor')||raw.includes('night audit')}
function normalizeNightAuditorSession(session:any){return session?.user&&isNightAuditorRole(session.user.role)?{...session,user:{...session.user,permissions:NIGHT_AUDITOR_PERMISSIONS}}:session}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('status') status(){return this.auth.status()}
  @Post('setup') setup(@Body() body:{firstName?:string;lastName?:string;email?:string;password?:string}){return this.auth.setup(body)}
  @Post('login') async login(@Body() body:{email?:string;password?:string}){return normalizeNightAuditorSession(await this.auth.login(body))}
  @Post('change-password') changePassword(@Headers('authorization') authorization:string|undefined,@Body() body:{password?:string}){return this.auth.changeOwnPassword(authorization,body.password)}
  @Get('admin/users') async adminUsers(@Headers('authorization') authorization?:string){
    const users=await this.auth.adminUsers(authorization) as any[];
    return users.map(user=>user.baseRole==='night_auditor'&&!user.permissionsCustomized?{...user,inheritedPermissions:NIGHT_AUDITOR_PERMISSIONS,permissions:NIGHT_AUDITOR_PERMISSIONS}:user);
  }
  @Get('admin/roles') async adminRoles(@Headers('authorization') authorization?:string){
    const roles=await this.auth.adminRoles(authorization) as any[];
    const canonical=roles.find(role=>role.name==='VEILLEUR DE NUIT');
    let nightAuditorSeen=false;
    return roles.filter(role=>{
      if(role.baseRole!=='night_auditor')return true;
      const sameCanonicalLabel=normalize(String(role.label||''))==='veilleur de nuit';
      if(!sameCanonicalLabel)return true;
      if(canonical)return role.name===canonical.name;
      if(nightAuditorSeen)return false;
      nightAuditorSeen=true;
      return true;
    });
  }
  @Post('admin/roles') createRole(@Headers('authorization') authorization:string|undefined,@Body() body:{label?:string;description?:string;baseRole?:string}){return this.auth.createRole(authorization,body)}
  @Post('admin/users') createUser(@Headers('authorization') authorization:string|undefined,@Body() body:{firstName?:string;lastName?:string;email?:string;password?:string;role?:string}){return this.auth.createUser(authorization,body)}
  @Patch('admin/users/:id') updateUser(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{firstName?:string;lastName?:string;email?:string;role?:string;status?:'ACTIVE'|'INACTIVE'}){return this.auth.updateUser(authorization,id,body)}
  @Delete('admin/users/:id') deleteUser(@Headers('authorization') authorization:string|undefined,@Param('id') id:string){return this.auth.deleteUser(authorization,id)}
  @Patch('admin/users/:id/permissions') updateUserPermissions(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{permissions?:string[];reset?:boolean}){return this.auth.updateUserPermissions(authorization,id,body)}
  @Post('admin/users/:id/password') resetPassword(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{password?:string}){return this.auth.resetPassword(authorization,id,body.password)}
  @Post('admin/users/:id/temporary-password') temporaryPassword(@Headers('authorization') authorization:string|undefined,@Param('id') id:string){return this.auth.generateTemporaryPassword(authorization,id)}
}
