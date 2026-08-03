/**
 * 认证相关类型定义。
 */

/**
 * 登录用户上下文（挂载到 request.user）。
 */
export interface AuthUser {
  userId: string;
  email: string;
}
