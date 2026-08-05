import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * 管理员登录请求。
 */
export class AdminLoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}

/**
 * 管理员登录响应。
 */
export interface AdminLoginResult {
  accessToken: string;
  admin: { userId: string; email: string; role: 'admin' | 'super_admin' };
}

/**
 * 管理员上下文（挂载到 request.user，由 AdminAuthGuard 注入）。
 */
export interface AdminUser {
  userId: string;
  email: string;
  role: 'admin' | 'super_admin';
}