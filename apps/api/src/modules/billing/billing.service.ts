import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 解锁订单服务（扫码代收，人工确认后开通完整版 pro）。
 *
 * 说明：个人收款码/聚合支付没有自动回调，因此采用"用户下单 → 扫码付款
 * → 管理端人工核对订单号/邮箱 → 确认开通"的轻量流程，无需企业资质。
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 解锁信息（价格、收款码、客服联系方式），供前端解锁页展示。
   */
  unlockInfo() {
    return {
      price: this.config.get<number>('billing.unlockPrice', 9.9),
      currency: 'CNY',
      qrWechat: this.config.get<string>('billing.qrWechat', ''),
      qrAlipay: this.config.get<string>('billing.qrAlipay', ''),
      contact: this.config.get<string>('billing.contact', ''),
      proDays: this.config.get<number>('billing.proDays', 0),
      enabled: Boolean(
        this.config.get<string>('billing.qrWechat', '') ||
          this.config.get<string>('billing.qrAlipay', ''),
      ),
    };
  }

  /**
   * 用户下单：生成待确认订单，返回订单号与订单信息。
   */
  async createOrder(userId: string) {
    const price = this.config.get<number>('billing.unlockPrice', 9.9);
    const orderNo = this.genOrderNo();

    // 复用仍在"待确认"的订单，避免重复下单堆积
    const existing = await this.prisma.payOrder.findFirst({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return this.toOrderView(existing);
    }

    const order = await this.prisma.payOrder.create({
      data: { userId, orderNo, amount: price },
    });
    return this.toOrderView(order);
  }

  /**
   * 查询当前用户的历史订单。
   */
  async listMyOrders(userId: string) {
    const orders = await this.prisma.payOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return orders.map((o) => this.toOrderView(o));
  }

  /**
   * 管理端：列出订单，支持按状态/关键词/日期筛选 + 分页。
   */
  async adminListOrders(params: {
    status?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    if (params.keyword) {
      where.OR = [
        { orderNo: { contains: params.keyword, mode: 'insensitive' as const } },
        { user: { email: { contains: params.keyword, mode: 'insensitive' as const } } },
      ];
    }

    if (params.dateFrom || params.dateTo) {
      const gte = params.dateFrom ? new Date(params.dateFrom) : undefined;
      const lte = params.dateTo ? new Date(params.dateTo + 'T23:59:59') : undefined;
      if (gte || lte) {
        where.createdAt = {};
        if (gte) where.createdAt = { ...(where.createdAt as object), gte };
        if (lte) where.createdAt = { ...(where.createdAt as object), lte };
      }
    }

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.payOrder.count({ where }),
      this.prisma.payOrder.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      orders: orders.map((o) => ({
        ...this.toOrderView(o),
        email: o.user.email,
      })),
    };
  }

  /**
   * 管理端：手动为指定用户创建订单（线下付款补录场景）。
   */
  async adminCreateOrder(params: { email: string; amount?: number; note?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });
    if (!user) throw new NotFoundException(`用户 ${params.email} 不存在`);

    const price = params.amount ?? this.config.get<number>('billing.unlockPrice', 9.9);
    const orderNo = this.genOrderNo();

    const order = await this.prisma.payOrder.create({
      data: {
        userId: user.id,
        orderNo,
        amount: price,
        note: params.note ?? null,
      },
    });

    this.logger.log(`管理员手动创建订单 ${orderNo}，用户 ${user.email}，金额 ¥${price}`);
    return { ok: true, ...this.toOrderView(order), email: user.email };
  }

  /**
   * 管理端：确认订单已付款，为用户开通完整版 pro。
   */
  async adminConfirmOrder(orderId: string) {
    const order = await this.prisma.payOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status === 'paid') {
      throw new BadRequestException('该订单已确认付款');
    }
    if (order.status === 'refunded') {
      throw new BadRequestException('该订单已退款');
    }

    const now = new Date();
    const proDays = this.config.get<number>('billing.proDays', 0);
    const proExpiresAt = proDays > 0 ? new Date(now.getTime() + proDays * 86400_000) : null;

    // 开通完整版（事务：订单置为已付 + 更新额度套餐）
    await this.prisma.$transaction([
      this.prisma.payOrder.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt: now },
      }),
      this.prisma.userQuota.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, plan: 'pro', proExpiresAt },
        update: { plan: 'pro', proExpiresAt },
      }),
    ]);

    this.logger.log(`订单 ${order.orderNo} 已确认付款，用户 ${order.userId} 开通完整版`);
    return { ok: true, orderNo: order.orderNo };
  }

  /**
   * 管理端：取消订单（仅待确认状态）。
   */
  async adminCancelOrder(orderId: string) {
    const order = await this.prisma.payOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') {
      throw new BadRequestException('只有待确认订单可取消');
    }
    await this.prisma.payOrder.update({
      where: { id: order.id },
      data: { status: 'cancelled' },
    });
    return { ok: true };
  }

  /**
   * 管理端：退款已开通订单（回退用户权限，订单置为 refunded）。
   */
  async adminRefundOrder(orderId: string) {
    const order = await this.prisma.payOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'paid') {
      throw new BadRequestException('仅已开通订单可退款');
    }

    // 事务：订单置为 refunded + 用户降级为 free
    await this.prisma.$transaction([
      this.prisma.payOrder.update({
        where: { id: order.id },
        data: { status: 'refunded' },
      }),
      this.prisma.userQuota.update({
        where: { userId: order.userId },
        data: { plan: 'free', proExpiresAt: null },
      }),
    ]);

    this.logger.log(`订单 ${order.orderNo} 已退款，用户 ${order.userId} 降级为免费版`);
    return { ok: true };
  }

  /**
   * 管理端：更新订单备注。
   */
  async adminUpdateNote(orderId: string, note: string) {
    const order = await this.prisma.payOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    await this.prisma.payOrder.update({
      where: { id: order.id },
      data: { note: note || null },
    });
    return { ok: true };
  }

  /**
   * 查询当前用户套餐状态（解锁页展示：是否已开通 / 到期时间 / 剩余免费概览）。
   */
  async myStatus(userId: string) {
    const q = await this.prisma.userQuota.findUnique({ where: { userId } });
    const plan =
      q?.plan === 'pro' &&
      q.proExpiresAt &&
      new Date(q.proExpiresAt) < new Date()
        ? 'free'
        : q?.plan === 'pro'
          ? 'pro'
          : 'free';
    return {
      plan,
      proExpiresAt: q?.proExpiresAt ? q.proExpiresAt.toISOString() : null,
      overviewRemaining: Math.max(
        (q?.freeOverviewCalls ?? 1) - (q?.usedOverviewCalls ?? 0),
        0,
      ),
    };
  }

  private genOrderNo(): string {
    const d = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    const ts =
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const rand = Math.floor(Math.random() * 90 + 10);
    return `DY${ts}${rand}`;
  }

  private toOrderView(o: {
    id: string;
    orderNo: string;
    amount: { toString(): string } | number;
    type: string;
    status: string;
    paidAt: Date | null;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: o.id,
      orderNo: o.orderNo,
      amount: Number(o.amount),
      type: o.type,
      status: o.status,
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      note: o.note,
      createdAt: o.createdAt.toISOString(),
    };
  }
}