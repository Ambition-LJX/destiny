import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../../common/dto/auth.types';

/**
 * 封禁守卫：拦截被封禁用户的写操作。
 * 必须与 JwtAuthGuard 一起使用（读取其注入到 request.user 的 banned 字段）。
 * 软封禁设计：只读接口（查看/导出数据）仍放行，业务写操作被拦截。
 */
@Injectable()
export class NotBannedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;
    if (user?.banned) {
      throw new ForbiddenException(
        '账号已被封禁，业务功能暂不可用。如需查看或导出您的数据，请联系客服。',
      );
    }
    return true;
  }
}