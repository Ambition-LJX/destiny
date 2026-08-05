import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { ReportsService } from '../reports/reports.service';
import type { AdminUser } from './dto/admin.dto';

/**
 * 管理员业务：用户管理、订单管理、审计日志、成本统计。
 *
 * 权限约定（由控制器守卫落实）：
 * - 普通管理员(admin)：仅订单
 * - 超级管理员(super_admin)：全部
 */
@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * 首次引导：配置了 SUPER_ADMIN_EMAIL 时，确保该邮箱对应的账号是超级管理员。
   * - 账号已存在 → 提升为超级管理员
   * - 账号不存在且配置了 SUPER_ADMIN_PASSWORD → 自动创建（含初始密码 + 额度记录）
   * 这样全新的 docker 空库部署也能直接拥有可登录的管理员账号。
   */
  async onModuleInit() {
    const email = this.config.get<string>('bootstrap.superAdminEmail', '')?.trim().toLowerCase();
    if (!email) return;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      if (user.role !== 'super_admin') {
        await this.prisma.user.update({ where: { id: user.id }, data: { role: 'super_admin' } });
        this.logger.log(`已将 ${email} 提升为超级管理员`);
      }
      return;
    }

    // 账号不存在：若配置了初始密码则自动创建，否则给出提示
    const password = this.config.get<string>('bootstrap.superAdminPassword', '');
    if (!password) {
      this.logger.warn(
        `已配置 SUPER_ADMIN_EMAIL=${email} 但用户不存在，且未配置 SUPER_ADMIN_PASSWORD，无法自动创建超级管理员`,
      );
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.prisma.user.create({
      data: { email, passwordHash, role: 'super_admin' },
    });
    // 预建额度记录（免费套餐），保证后续额度查询/计量始终存在
    await this.prisma.userQuota.create({ data: { userId: created.id } });
    this.logger.log(`首次部署：已自动创建超级管理员 ${email}`);
  }

  // ===== 用户管理（超级管理员）=====

  /** 用户列表（含额度概览）。 */
  async listUsers(params: { page?: number; pageSize?: number; keyword?: string }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const where = params.keyword
      ? {
          OR: [
            { email: { contains: params.keyword, mode: 'insensitive' as const } },
            { id: params.keyword },
          ],
        }
      : {};
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { quota: true },
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        bannedAt: u.bannedAt ? u.bannedAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        plan: u.quota?.plan ?? 'free',
        proExpiresAt: u.quota?.proExpiresAt ? u.quota.proExpiresAt.toISOString() : null,
        overviewUsed: u.quota?.usedOverviewCalls ?? 0,
        overviewFree: u.quota?.freeOverviewCalls ?? 1,
        usedReportCalls: u.quota?.usedReportCalls ?? 0,
        usedAskCalls: u.quota?.usedAskCalls ?? 0,
        lifetimeTokens: u.quota ? Number(u.quota.lifetimeTokens) : 0,
        lifetimeCost: u.quota ? Number(u.quota.lifetimeCost) : 0,
      })),
    };
  }

  /** 用户详情（含额度、档案数、订单）。 */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        quota: true,
        profiles: { select: { id: true, name: true, createdAt: true } },
        payOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      profiles: user.profiles,
      quota: user.quota
        ? {
            plan: user.quota.plan,
            proExpiresAt: user.quota.proExpiresAt
              ? user.quota.proExpiresAt.toISOString()
              : null,
            overviewFree: user.quota.freeOverviewCalls,
            overviewUsed: user.quota.usedOverviewCalls,
            usedReportCalls: user.quota.usedReportCalls,
            usedAskCalls: user.quota.usedAskCalls,
            lifetimeTokens: Number(user.quota.lifetimeTokens),
            lifetimeCost: Number(user.quota.lifetimeCost),
          }
        : null,
      orders: user.payOrders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        amount: Number(o.amount),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  /** 封禁用户。 */
  async banUser(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    if (target.id === admin.userId) throw new BadRequestException('不能封禁自己');
    if (target.role === 'super_admin') throw new BadRequestException('不能封禁超级管理员');
    await this.prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date() } });
    await this.log(admin, 'user_ban', target.id, target.email, null);
    return { ok: true };
  }

  /** 解封用户。 */
  async unbanUser(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    await this.prisma.user.update({ where: { id: userId }, data: { bannedAt: null } });
    await this.log(admin, 'user_unban', target.id, target.email, null);
    return { ok: true };
  }

  /** 重置用户当前周期已用额度（保留累计成本）。 */
  async resetQuota(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    await this.prisma.userQuota.upsert({
      where: { userId },
      create: { userId },
      update: { usedOverviewCalls: 0, usedReportCalls: 0, usedAskCalls: 0 },
    });
    await this.log(admin, 'quota_reset', target.id, target.email, null);
    return { ok: true };
  }

  /** 手动开通完整版 pro。 */
  async grantPro(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    const proDays = this.config.get<number>('billing.proDays', 0);
    const proExpiresAt = proDays > 0 ? new Date(Date.now() + proDays * 86400_000) : null;
    await this.prisma.userQuota.upsert({
      where: { userId },
      create: { userId, plan: 'pro', proExpiresAt },
      update: { plan: 'pro', proExpiresAt },
    });
    await this.log(admin, 'pro_grant', target.id, target.email, proDays > 0 ? `${proDays}天` : '永久');
    return { ok: true };
  }

  /** 手动取消完整版 pro。 */
  async revokePro(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    await this.prisma.userQuota.update({
      where: { userId },
      data: { plan: 'free', proExpiresAt: null },
    });
    await this.log(admin, 'pro_revoke', target.id, target.email, null);
    return { ok: true };
  }

  /** 将普通用户设为管理员。 */
  async setAdmin(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    if (target.role === 'super_admin') throw new BadRequestException('已是超级管理员');
    if (target.bannedAt) throw new BadRequestException('被封禁用户不能设为管理员');
    await this.prisma.user.update({ where: { id: userId }, data: { role: 'admin' } });
    await this.log(admin, 'role_set', target.id, target.email, 'user→admin');
    return { ok: true };
  }

  /** 取消管理员身份（降为普通用户）。 */
  async unsetAdmin(admin: AdminUser, userId: string) {
    const target = await this.requireUser(userId);
    if (target.role !== 'admin') throw new BadRequestException('该用户不是普通管理员');
    if (target.id === admin.userId) throw new BadRequestException('不能取消自己的管理员身份');
    await this.prisma.user.update({ where: { id: userId }, data: { role: 'user' } });
    await this.log(admin, 'role_unset', target.id, target.email, 'admin→user');
    return { ok: true };
  }

  // ===== 订单管理（管理员 + 超级管理员）=====

  /** 订单列表（支持筛选+分页）。 */
  async listOrders(params: {
    status?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.billing.adminListOrders(params);
  }

  /** 手动创建订单（仅超级管理员）。 */
  async createOrder(admin: AdminUser, params: { email: string; amount?: number; note?: string }) {
    const result = await this.billing.adminCreateOrder(params);
    await this.log(admin, 'order_create', null, result.email, `手动创建订单 ${result.orderNo}，金额 ¥${result.amount}`);
    return result;
  }

  /** 确认订单付款并开通，记录审计。 */
  async confirmOrder(admin: AdminUser, orderId: string) {
    const result = await this.billing.adminConfirmOrder(orderId);
    await this.log(admin, 'order_confirm', null, null, result.orderNo);
    return result;
  }

  /** 取消订单，记录审计。 */
  async cancelOrder(admin: AdminUser, orderId: string) {
    const order = await this.prisma.payOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    const result = await this.billing.adminCancelOrder(orderId);
    await this.log(admin, 'order_cancel', order.userId, null, order.orderNo);
    return result;
  }

  /** 退款订单（仅超级管理员）。 */
  async refundOrder(admin: AdminUser, orderId: string) {
    const order = await this.prisma.payOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    const result = await this.billing.adminRefundOrder(orderId);
    await this.log(admin, 'order_refund', order.userId, null, order.orderNo);
    return result;
  }

  /** 更新订单备注（仅超级管理员）。 */
  async updateOrderNote(admin: AdminUser, orderId: string, note: string) {
    const result = await this.billing.adminUpdateNote(orderId, note);
    await this.log(admin, 'order_note', null, null, `订单 ${orderId} 备注已更新`);
    return result;
  }

  // ===== 审计日志（超级管理员）=====

  /** 查询审计日志。 */
  async listLogs(params: { page?: number; pageSize?: number }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 30, 1), 100);
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.adminLog.count(),
      this.prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      logs: logs.map((l) => ({
        id: l.id,
        adminEmail: l.adminEmail,
        action: l.action,
        targetUserEmail: l.targetUserEmail,
        targetOrderId: l.targetOrderId,
        detail: l.detail,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  /** 批量删除审计日志（仅超级管理员）。 */
  async deleteLogs(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('请指定要删除的日志');
    }
    const uniqueIds = [...new Set(ids)];
    const result = await this.prisma.adminLog.deleteMany({
      where: { id: { in: uniqueIds } },
    });
    return { ok: true, deleted: result.count };
  }

  /** 清空全部审计日志（仅超级管理员）。 */
  async clearLogs() {
    const result = await this.prisma.adminLog.deleteMany({});
    return { ok: true, deleted: result.count };
  }

  // ===== 成本统计（超级管理员）=====

  /** 成本统计看板（复用 ReportsService）。 */
  async costStats() {
    return this.reports.costStats();
  }

  // ===== 内部工具 =====

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  private async log(
    admin: AdminUser,
    action: string,
    targetUserId: string | null,
    targetUserEmail: string | null,
    detail: string | null,
  ) {
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        adminEmail: admin.email,
        action,
        targetUserId,
        targetUserEmail,
        detail,
      },
    });
  }
}