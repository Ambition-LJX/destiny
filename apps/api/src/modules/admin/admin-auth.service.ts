import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto, type AdminLoginResult } from './dto/admin.dto';

/**
 * 管理员认证：邮箱 + 密码登录，校验角色后签发专属管理令牌。
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // 统一提示，避免暴露"该邮箱是否为管理员"
    if (!user || user.deletedAt || (user.role !== 'admin' && user.role !== 'super_admin')) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.bannedAt) {
      throw new UnauthorizedException('账号已被封禁');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const role = user.role as 'admin' | 'super_admin';
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('jwt.adminSecret'),
        expiresIn: this.config.get<string>('jwt.adminExpiresIn'),
      },
    );
    return { accessToken, admin: { userId: user.id, email: user.email, role } };
  }
}