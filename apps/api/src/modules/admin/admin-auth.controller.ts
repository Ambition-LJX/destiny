import { Body, Controller, Post } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin.dto';

/**
 * 管理员认证接口。
 */
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** 管理员登录（需账号已具备 admin / super_admin 角色）。 */
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto);
  }
}