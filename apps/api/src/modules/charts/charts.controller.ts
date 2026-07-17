import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import { ChartsService } from './charts.service';
import { CalculateChartDto } from './dto/chart.dto';

/**
 * 排盘接口。调用引擎返回结构化结果，全部需要登录。
 */
@Controller('charts')
@UseGuards(JwtAuthGuard)
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Post('calculate')
  calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculateChartDto) {
    return this.charts.calculate(user.userId, dto.profileId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.charts.getChart(user.userId, id);
  }
}
