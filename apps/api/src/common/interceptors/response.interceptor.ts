import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, SUCCESS_CODE } from '../dto/api-response';

/**
 * 把控制器返回值包装为统一响应结构 { code, message, data }。
 * 已经是标准结构的（含 code 字段）直接透传。
 * 流式响应（SSE）不经过此拦截器包装。
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data
        ) {
          return data as ApiResponse<T>;
        }
        return { code: SUCCESS_CODE, message: 'ok', data };
      }),
    );
  }
}
