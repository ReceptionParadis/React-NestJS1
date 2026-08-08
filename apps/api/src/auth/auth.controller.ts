import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('status') status(){return this.auth.status()}
  @Post('setup') setup(@Body() body:{firstName?:string;lastName?:string;email?:string;password?:string}){return this.auth.setup(body)}
  @Post('login') login(@Body() body:{email?:string;password?:string}){return this.auth.login(body)}
  @Get('admin/users') adminUsers(@Headers('authorization') authorization?:string){return this.auth.adminUsers(authorization)}
  @Get('admin/roles') adminRoles(@Headers('authorization') authorization?:string){return this.auth.adminRoles(authorization)}
  @Post('admin/roles') createRole(@Headers('authorization') authorization:string|undefined,@Body() body:{label?:string;description?:string;baseRole?:string}){return this.auth.createRole(authorization,body)}
  @Post('admin/users') createUser(@Headers('authorization') authorization:string|undefined,@Body() body:{firstName?:string;lastName?:string;email?:string;password?:string;role?:string}){return this.auth.createUser(authorization,body)}
  @Patch('admin/users/:id') updateUser(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{firstName?:string;lastName?:string;email?:string;role?:string;status?:'ACTIVE'|'INACTIVE'}){return this.auth.updateUser(authorization,id,body)}
  @Patch('admin/users/:id/permissions') updateUserPermissions(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{permissions?:string[];reset?:boolean}){return this.auth.updateUserPermissions(authorization,id,body)}
  @Post('admin/users/:id/password') resetPassword(@Headers('authorization') authorization:string|undefined,@Param('id') id:string,@Body() body:{password?:string}){return this.auth.resetPassword(authorization,id,body.password)}
}
