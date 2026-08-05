import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AdminUser } from '../dto/admin.dto';

/**
 * 超级管理员守卫。需配合 AdminAuthGuard 使用（先鉴权后验角色）。
 * 仅 super_admin 可通过。
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AdminUser }>();
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('需要超级管理员权限');
    }
    return true;
  }
}