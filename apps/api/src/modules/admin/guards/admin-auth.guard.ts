import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 管理员鉴权守卫（任意管理员：admin / super_admin）。
 * 策略会实时校验角色与封禁状态。
 */
@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {}