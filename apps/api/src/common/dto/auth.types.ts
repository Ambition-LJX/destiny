/**
 * 认证相关类型定义。
 */

/**
 * 登录用户上下文（挂载到 request.user）。
 */
export interface AuthUser {
  userId: string;
  email: string;
  /** 是否已被封禁（由 JwtStrategy 回查数据库注入）。 */
  banned?: boolean;
}
