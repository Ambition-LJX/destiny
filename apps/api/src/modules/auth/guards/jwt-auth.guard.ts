import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 鉴权守卫。受保护路由使用 @UseGuards(JwtAuthGuard)。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
