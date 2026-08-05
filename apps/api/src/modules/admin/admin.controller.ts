import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { AdminUser } from './dto/admin.dto';
import { AdminService } from './admin.service';

/**
 * 管理端业务接口。
 *
 * 权限：
 * - 订单模块：任意管理员（admin / super_admin）
 * - 用户管理 / 审计日志 / 成本统计：仅超级管理员
 */
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ===== 订单（管理员 + 超级管理员）=====

  @Get('orders')
  listOrders(
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listOrders({
      status,
      keyword,
      dateFrom,
      dateTo,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(SuperAdminGuard)
  @Post('orders')
  createOrder(
    @CurrentAdmin() admin: AdminUser,
    @Body() body: { email: string; amount?: number; note?: string },
  ) {
    return this.admin.createOrder(admin, body);
  }

  @Post('orders/:id/confirm')
  confirmOrder(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.confirmOrder(admin, id);
  }

  @Post('orders/:id/cancel')
  cancelOrder(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.cancelOrder(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('orders/:id/refund')
  refundOrder(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.refundOrder(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('orders/:id/note')
  updateOrderNote(
    @CurrentAdmin() admin: AdminUser,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    return this.admin.updateOrderNote(admin, id, body.note);
  }

  // ===== 用户管理（仅超级管理员）=====

  @UseGuards(SuperAdminGuard)
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.admin.listUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
    });
  }

  @UseGuards(SuperAdminGuard)
  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/ban')
  banUser(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.banUser(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/unban')
  unbanUser(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.unbanUser(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/reset-quota')
  resetQuota(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.resetQuota(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/grant-pro')
  grantPro(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.grantPro(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/revoke-pro')
  revokePro(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.revokePro(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/set-admin')
  setAdmin(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.setAdmin(admin, id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('users/:id/unset-admin')
  unsetAdmin(@CurrentAdmin() admin: AdminUser, @Param('id') id: string) {
    return this.admin.unsetAdmin(admin, id);
  }

  // ===== 审计日志（仅超级管理员）=====

  @UseGuards(SuperAdminGuard)
  @Get('logs')
  listLogs(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.admin.listLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(SuperAdminGuard)
  @Post('logs/delete')
  deleteLogs(@Body() body: { ids: string[] }) {
    return this.admin.deleteLogs(body?.ids);
  }

  @UseGuards(SuperAdminGuard)
  @Post('logs/clear')
  clearLogs() {
    return this.admin.clearLogs();
  }

  // ===== 成本统计（仅超级管理员）=====

  @UseGuards(SuperAdminGuard)
  @Get('cost-stats')
  costStats() {
    return this.admin.costStats();
  }
}