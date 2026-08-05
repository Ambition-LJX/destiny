import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../common/dto/auth.types';
import { ChartsService } from './charts.service';
import { CalculateChartDto } from './dto/chart.dto';
import type { Request } from 'express';

/**
 * 排盘接口。调用引擎返回结构化结果，全部需要登录。
 */
@Controller('charts')
@UseGuards(JwtAuthGuard)
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Post('calculate')
  @UseGuards(NotBannedGuard)
  calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculateChartDto) {
    return this.charts.calculate(user.userId, dto.profileId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.charts.getChart(user.userId, id);
  }

  /**
   * 批量修复旧版数据（需要管理员令牌）。
   * 用于数据库迁移后修复历史数据。
   */
  @Post('migrate')
  async migrate(@Req() req: Request) {
    const adminToken = req.header('x-admin-token') || '';
    if (adminToken !== process.env.ADMIN_TOKEN || !adminToken) {
      return { code: 403, message: '管理员令牌无效' };
    }
    const result = await this.charts.migrateAllCharts();
    return { code: 0, message: '迁移完成', data: result };
  }
}
