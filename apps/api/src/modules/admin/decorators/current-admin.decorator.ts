import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '../dto/admin.dto';

/**
 * 注入当前管理员上下文（由 AdminAuthGuard 填充到 request.user）。
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: AdminUser }>();
    return req.user as AdminUser;
  },
);