import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 注册请求。
 */
export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(64, { message: '密码最长 64 位' })
  password!: string;
}

/**
 * 登录请求。
 */
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}

/**
 * 刷新令牌请求。
 */
export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

/**
 * 认证响应。
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}
