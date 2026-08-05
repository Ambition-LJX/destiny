import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AdminUser } from '../dto/admin.dto';

/**
 * 管理员 JWT 载荷。
 */
export interface AdminJwtPayload {
  sub: string;
  email: string;
}

/**
 * 管理员 Access Token 校验策略。
 *
 * 每次请求都会回查数据库，确保角色/封禁状态实时生效：
 * - 用户被降级为普通用户 → 立即失去管理权限
 * - 用户被超管封禁 → 立即失效
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.adminSecret') ?? 'dev-admin-secret-change-me',
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, bannedAt: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('管理员不存在');
    }
    if (user.bannedAt) {
      throw new UnauthorizedException('管理员已被封禁');
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new UnauthorizedException('无管理权限');
    }
    return { userId: user.id, email: user.email, role: user.role as 'admin' | 'super_admin' };
  }
}