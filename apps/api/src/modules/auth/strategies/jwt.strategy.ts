import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthUser } from '../../../common/dto/auth.types';

/**
 * JWT 载荷。
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Access Token 校验策略。
 * 每次请求回查数据库，保证封禁状态即时生效（软封禁：只读仍可用，写操作由 NotBannedGuard 拦截）。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') ?? 'dev-access-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { bannedAt: true },
    });
    return {
      userId: payload.sub,
      email: payload.email,
      banned: !!user?.bannedAt,
    };
  }
}