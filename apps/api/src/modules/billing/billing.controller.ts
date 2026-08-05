import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../common/dto/auth.types';
import { BillingService } from './billing.service';

/**
 * 解锁（充值）与我的订单接口。
 *
 * 解锁流程：解锁页展示收款码 → 用户下单(生成订单号) → 扫码付款
 * → 用户/客服按订单号对账 → 管理端确认 → 开通完整版。
 * 管理端订单接口见 AdminModule（/admin/orders）。
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** 解锁信息（价格、收款码、客服联系方式）。 */
  @Get('unlock-info')
  unlockInfo() {
    return this.billing.unlockInfo();
  }

  /** 用户下单（生成待确认订单号）。 */
  @Post('orders')
  @UseGuards(NotBannedGuard)
  createOrder(@CurrentUser() user: AuthUser) {
    return this.billing.createOrder(user.userId);
  }

  /** 我的历史订单。 */
  @Get('orders/mine')
  myOrders(@CurrentUser() user: AuthUser) {
    return this.billing.listMyOrders(user.userId);
  }

  /** 我的当前套餐状态（等价于 /reports/quota，便于解锁页展示）。 */
  @Get('status')
  async status(@CurrentUser() user: AuthUser) {
    const base = await this.billing.myStatus(user.userId);
    return { ...base, banned: !!user.banned };
  }
}