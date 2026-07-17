/**
 * JWT 客户端解析工具。仅用于读取 payload 展示用途，不校验签名。
 */

export interface JwtPayload {
  sub: string;
  email: string;
  /** 过期时间（秒级 Unix 时间戳）。 */
  exp?: number;
  /** 签发时间（秒级 Unix 时间戳）。 */
  iat?: number;
}

/**
 * 解码 base64url 字符串为 UTF-8 文本。
 * JWT 使用 base64url（-、_，无 padding），需先转换再交给 atob。
 */
function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  // 处理多字节 UTF-8 字符（如邮箱含中文）。
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * 解析 JWT payload。失败返回 null。
 */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * 判断令牌是否已过期（或无法解析）。
 *
 * @param token JWT 字符串
 * @param skewSeconds 容差秒数，提前判定过期以避免临界失败，默认 10 秒
 */
export function isJwtExpired(token: string, skewSeconds = 10): boolean {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSeconds = Date.now() / 1000;
  return payload.exp <= nowSeconds + skewSeconds;
}
