import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 已认证用户信息（由 JwtStrategy.validate 注入到 request.user）。
 */
export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * 从请求中提取当前登录用户。
 * 用法：`method(@CurrentUser() user: AuthUser)`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
