/**
 * 统一响应结构：{ code, message, data }
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const SUCCESS_CODE = 0;

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: SUCCESS_CODE, message, data };
}
