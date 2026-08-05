'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminStore } from '@/lib/adminStore';
import { ToastContainer } from '@/components/Toast';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  adminApi,
  ApiError,
  type AdminLogView,
  type AdminOrderList,
  type AdminOrderView,
  type AdminUserList,
  type AdminUserView,
  type CostStats,
} from '@/lib/api';

/** 数字格式化：千分位 */
function fmtNum(n: number): string {
  return Number(n || 0).toLocaleString('zh-CN');
}

/** 金额格式化：人民币。有多少显示多少，不舍弃尾数 */
function fmtCny(n: number): string {
  const v = Number(n || 0);
  if (!isFinite(v) || v === 0) return '¥0';
  // 保留最多 8 位小数展示真实值，去掉末尾多余的 0
  const s = v.toFixed(8).replace(/\.?0+$/, '');
  return `¥${s}`;
}

/** 统计卡片（仪表盘顶部） */
function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'wood',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accent?: 'wood' | 'fire' | 'sky' | 'ink';
}) {
  const accentCls = {
    wood: 'bg-wood/10 text-wood',
    fire: 'bg-fire/10 text-fire',
    sky: 'bg-sky-500/10 text-sky-600',
    ink: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  }[accent];
  return (
    <div className="rounded-xl border border-ink-200/60 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${accentCls}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-0.5 font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">
            {value}
          </p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">{sub}</p>}
    </div>
  );
}

/** Badge 标签（状态/角色） */
function Badge({
  children,
  color = 'ink',
}: {
  children: React.ReactNode;
  color?: 'ink' | 'wood' | 'fire' | 'sky' | 'amber';
}) {
  const cls = {
    ink: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    wood: 'bg-wood/10 text-wood',
    fire: 'bg-fire/10 text-fire',
    sky: 'bg-sky-500/10 text-sky-600',
    amber: 'bg-amber-500/10 text-amber-600',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

const ACTION_LABEL: Record<string, string> = {
  order_create: '创建订单',
  order_confirm: '确认订单',
  order_cancel: '取消订单',
  order_refund: '退款订单',
  order_note: '更新备注',
  user_ban: '封禁用户',
  user_unban: '解封用户',
  quota_reset: '重置额度',
  pro_grant: '开通完整版',
  pro_revoke: '取消完整版',
  role_set: '设为管理员',
  role_unset: '取消管理员',
};

/** 管理员登录：独立后台风格，居中卡片，无前台导航栏 */
function AdminLogin() {
  const { login, loggingIn, error } = useAdminStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      {/* 背景装饰：柔和光晕 + 网格 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-wood/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* 品牌区 */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-wood text-2xl text-white shadow-lg shadow-wood/30">
            🔮
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-white">
            玄机命盘 · 管理后台
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            使用具备管理员权限的账号登录
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              login(email, password);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="管理员邮箱"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-ink-500 focus:border-wood"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-ink-500 focus:border-wood"
            />
            {error && <p className="text-sm text-fire">{error}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-lg bg-wood py-2 text-sm font-semibold text-white transition-colors hover:bg-wood/90 disabled:opacity-60"
            >
              {loggingIn ? '登录中…' : '登 录'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          仅限授权管理员访问 · 非授权人员请离开
        </p>
      </div>
    </div>
  );
}

/** 状态标签映射（带颜色） */
const STATUS_BADGE: Record<string, { label: string; color: 'ink' | 'wood' | 'fire' | 'amber' }> = {
  pending: { label: '待确认', color: 'fire' },
  paid: { label: '已开通', color: 'wood' },
  cancelled: { label: '已取消', color: 'ink' },
  refunded: { label: '已退款', color: 'amber' },
};

/** 创建订单弹窗（仅超级管理员） */
function CreateOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { role } = useAdminStore();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function submit() {
    if (!email.trim()) {
      setError('请输入用户邮箱');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await adminApi.createOrder({
        email: email.trim(),
        amount: amount ? Number(amount) : undefined,
        note: note.trim() || undefined,
      });
      toastSuccess('订单创建成功');
      onCreated();
      onClose();
      setEmail('');
      setAmount('');
      setNote('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-ink-900">
        <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100">
          手动创建订单
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          为指定用户创建一笔待确认订单，用于线下付款补录场景
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-600 dark:text-ink-400">
              用户邮箱 <span className="text-fire">*</span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-wood dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 dark:text-ink-400">
              金额（元，留空使用默认价 ¥{role === 'super_admin' ? '9.9' : '—'}）
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="不填则使用默认价格"
              className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-wood dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 dark:text-ink-400">
              备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="内部备注，如：已微信核对"
              className="mt-1 w-full resize-none rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-wood dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            />
          </div>
          {error && <p className="text-sm text-fire">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-ink-100 px-4 py-2 text-sm text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-wood px-4 py-2 text-sm font-semibold text-white hover:bg-wood/90 disabled:opacity-60"
          >
            {submitting ? '创建中…' : '创建订单'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 订单管理（管理员 + 超级管理员） */
function OrdersPanel() {
  const { role } = useAdminStore();
  const [data, setData] = useState<AdminOrderList | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isSuper = role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.orders({
        status: statusFilter || undefined,
        keyword: keyword || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, keyword, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, fn: () => Promise<unknown>, successMsg: string) {
    setActionLoadingId(id);
    try {
      await fn();
      toastSuccess(successMsg);
      await load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setActionLoadingId(null);
    }
  }

  function resetFilters() {
    setStatusFilter('');
    setKeyword('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  function startEditNote(o: AdminOrderView) {
    setEditingNoteId(o.id);
    setNoteDraft(o.note ?? '');
  }

  async function saveNote() {
    if (!editingNoteId) return;
    try {
      await adminApi.updateOrderNote(editingNoteId, noteDraft);
      setEditingNoteId(null);
      toastSuccess('备注已更新');
      await load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '备注保存失败');
    }
  }

  // 统计数据
  const orders = data?.orders ?? [];
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const paidCount = orders.filter((o) => o.status === 'paid').length;
  const revenue = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + Number(o.amount), 0);
  const refundAmount = orders.filter((o) => o.status === 'refunded').reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="订单总数" value={data?.total ?? 0} icon="📋" accent="ink" />
        <StatCard label="待确认" value={pendingCount} icon="⏳" accent="fire" sub="当前页" />
        <StatCard label="已开通" value={paidCount} icon="✅" accent="wood" sub="当前页" />
        <StatCard label="已开通金额" value={fmtCny(revenue)} icon="💰" accent="wood" sub={`退款 ${fmtCny(refundAmount)}`} />
      </div>

      {/* 筛选工具栏 */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {/* 状态筛选 */}
        <div className="flex items-center gap-1.5">
          {[
            { v: '', l: '全部' },
            { v: 'pending', l: '待确认' },
            { v: 'paid', l: '已开通' },
            { v: 'cancelled', l: '已取消' },
            { v: 'refunded', l: '已退款' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => { setStatusFilter(s.v); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s.v
                  ? 'bg-wood text-white shadow-sm shadow-wood/30'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* 搜索 */}
        <input
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          placeholder="订单号 / 用户邮箱"
          className="min-w-[180px] flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-wood dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />

        {/* 日期范围 */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-wood dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />
        <span className="text-xs text-ink-400">至</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-wood dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />

        {/* 操作按钮 */}
        {(keyword || dateFrom || dateTo || statusFilter) && (
          <button
            onClick={resetFilters}
            className="rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
          >
            清除筛选
          </button>
        )}

        {isSuper && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-wood px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wood/90"
          >
            + 手动创建订单
          </button>
        )}
      </div>

      {/* 统计条 */}
      <div className="mt-3 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
        <span>共 {data?.total ?? 0} 条记录</span>
        {data && data.orders.length > 0 && (
          <span>第 {data.page} / {totalPages} 页</span>
        )}
      </div>

      {/* 订单表格 */}
      {!data || data.orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-3 text-4xl opacity-40">📋</div>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {data && data.total === 0 && (keyword || dateFrom || dateTo || statusFilter)
              ? '没有符合条件的订单'
              : '暂无订单。用户扫码付款后，在此核对订单号并确认开通。'}
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-400">
                <th className="px-4 py-3 font-medium">订单号</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 text-right font-medium">金额</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">备注</th>
                <th className="px-4 py-3 font-medium">下单时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => {
                const st = STATUS_BADGE[o.status] ?? { label: o.status, color: 'ink' as const };
                const isActing = actionLoadingId === o.id;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-ink-100 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/30"
                  >
                    <td className="px-4 py-3">
                      <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                        {o.orderNo}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ink-700 dark:text-ink-300">{o.email}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-amber-600">
                      ¥{Number(o.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={st.color}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {editingNoteId === o.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNote();
                              if (e.key === 'Escape') setEditingNoteId(null);
                            }}
                            autoFocus
                            className="w-32 rounded border border-wood bg-white px-2 py-1 text-xs text-ink-900 outline-none dark:bg-ink-800 dark:text-ink-100"
                          />
                          <button
                            onClick={saveNote}
                            className="rounded bg-wood px-2 py-1 text-[11px] text-white"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="rounded bg-ink-100 px-2 py-1 text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <span
                          className="max-w-[160px] truncate text-xs text-ink-500 dark:text-ink-400"
                          title={o.note ?? ''}
                        >
                          {o.note || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {new Date(o.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {isActing ? (
                          <span className="text-xs text-ink-400">处理中…</span>
                        ) : (
                          <>
                            {o.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => act(o.id, () => adminApi.confirmOrder(o.id), '订单已确认开通')}
                                  className="rounded-md bg-wood px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-wood/90"
                                >
                                  确认开通
                                </button>
                                <button
                                  onClick={() => act(o.id, () => adminApi.cancelOrder(o.id), '订单已取消')}
                                  className="rounded-md bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-200 dark:bg-ink-700 dark:text-ink-300"
                                >
                                  取消
                                </button>
                              </>
                            )}
                            {o.status === 'paid' && isSuper && (
                              <button
                                onClick={() => {
                                  if (confirm(`确认对订单 ${o.orderNo} 执行退款？用户将降级为免费版。`)) {
                                    act(o.id, () => adminApi.refundOrder(o.id), '订单已退款');
                                  }
                                }}
                                className="rounded-md bg-fire/10 px-3 py-1 text-xs font-semibold text-fire hover:bg-fire/20"
                              >
                                退款
                              </button>
                            )}
                            {isSuper && (
                              <button
                                onClick={() => startEditNote(o)}
                                className="rounded-md bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                                title="编辑备注"
                              >
                                备注
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm text-ink-600 shadow-sm hover:bg-ink-50 disabled:opacity-40 dark:bg-ink-900 dark:text-ink-300"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </button>
          <span className="text-sm text-ink-500">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm text-ink-600 shadow-sm hover:bg-ink-50 disabled:opacity-40 dark:bg-ink-900 dark:text-ink-300"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {/* 创建订单弹窗 */}
      {isSuper && (
        <CreateOrderModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

/** 用户管理（仅超级管理员） */
function UsersPanel() {
  const [data, setData] = useState<AdminUserList | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.users({ page, pageSize: 20, keyword: keyword || undefined }));
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, fn: () => Promise<unknown>, successMsg: string) {
    setActionLoadingId(id);
    try {
      await fn();
      toastSuccess(successMsg);
      await load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setActionLoadingId(null);
    }
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  // 统计数据
  const users = data?.users ?? [];
  const proCount = users.filter((u) => u.plan === 'pro').length;
  const bannedCount = users.filter((u) => u.bannedAt).length;
  const totalCost = users.reduce((sum, u) => sum + u.lifetimeCost, 0);
  const totalTokens = users.reduce((sum, u) => sum + u.lifetimeTokens, 0);

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="用户总数" value={data?.total ?? 0} icon="👥" accent="sky" />
        <StatCard label="PRO 用户" value={proCount} icon="⭐" accent="wood" sub="当前页" />
        <StatCard label="已封禁" value={bannedCount} icon="🚫" accent="fire" sub="当前页" />
        <StatCard label="累计成本" value={fmtCny(totalCost)} icon="💰" accent="fire" sub={`${fmtNum(totalTokens)} Token`} />
      </div>

      {/* 工具栏 */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          placeholder="搜索邮箱 / 用户ID"
          className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-wood dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500">
            共 <span className="font-semibold text-ink-900 dark:text-ink-100">{data?.total ?? 0}</span> 位用户
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-600 hover:bg-ink-200 disabled:opacity-40 dark:bg-ink-800 dark:text-ink-300"
          >
            {loading ? '加载中…' : '刷新'}
          </button>
        </div>
      </div>

      {/* 用户表格 */}
      {users.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-3 text-4xl opacity-40">👥</div>
          <p className="text-sm text-ink-500 dark:text-ink-400">暂无用户</p>
          {keyword && (
            <p className="mt-1 text-xs text-ink-400">没有找到匹配 "{keyword}" 的用户</p>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-400">
                <th className="px-4 py-3 text-left font-medium">用户</th>
                <th className="px-4 py-3 text-center font-medium">角色</th>
                <th className="px-4 py-3 text-center font-medium">套餐</th>
                <th className="px-4 py-3 text-right font-medium">额度使用</th>
                <th className="px-4 py-3 text-right font-medium">累计Token</th>
                <th className="px-4 py-3 text-right font-medium">成本</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isActing = actionLoadingId === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-ink-100 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wood/20 text-xs font-bold text-wood">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-ink-900 dark:text-ink-100">{u.email}</p>
                          {u.bannedAt && (
                            <Badge color="fire">已封禁</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.role === 'super_admin' ? (
                        <Badge color="wood">超级管理员</Badge>
                      ) : u.role === 'admin' ? (
                        <Badge color="sky">管理员</Badge>
                      ) : (
                        <Badge color="ink">普通用户</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.plan === 'pro' ? (
                        <Badge color="wood">PRO</Badge>
                      ) : (
                        <Badge color="ink">FREE</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-ink-500 dark:text-ink-400">概览</span>
                          <span className="font-mono text-base font-bold text-ink-900 dark:text-ink-100">
                            {u.overviewUsed}
                            <span className="mx-0.5 text-ink-300">/</span>
                            {u.overviewFree}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-ink-500 dark:text-ink-400">报告</span>
                          <span className="font-mono text-base font-bold text-wood">
                            {u.usedReportCalls}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-ink-500 dark:text-ink-400">问答</span>
                          <span className="font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                            {u.usedAskCalls}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base font-bold text-ink-900 dark:text-ink-100">
                      {fmtNum(u.lifetimeTokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base font-bold text-amber-600">
                      {fmtCny(u.lifetimeCost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {isActing ? (
                          <span className="text-xs text-ink-400">处理中…</span>
                        ) : (
                          <>
                            {u.plan === 'pro' ? (
                              <button
                                onClick={() => act(u.id, () => adminApi.revokePro(u.id), '已取消 PRO 权限')}
                                className="rounded-md bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                              >
                                取消PRO
                              </button>
                            ) : (
                              <button
                                onClick={() => act(u.id, () => adminApi.grantPro(u.id), '已开通 PRO 权限')}
                                className="rounded-md bg-wood/10 px-2.5 py-1 text-[11px] font-medium text-wood hover:bg-wood/20"
                              >
                                开通PRO
                              </button>
                            )}
                            {u.bannedAt ? (
                              <button
                                onClick={() => act(u.id, () => adminApi.unban(u.id), '已解封用户')}
                                className="rounded-md bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                              >
                                解封
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`确认封禁用户 ${u.email}？`)) {
                                    act(u.id, () => adminApi.ban(u.id), '已封禁用户');
                                  }
                                }}
                                className="rounded-md bg-fire/10 px-2.5 py-1 text-[11px] font-medium text-fire hover:bg-fire/20"
                              >
                                封禁
                              </button>
                            )}
                            <button
                              onClick={() => act(u.id, () => adminApi.resetQuota(u.id), '已重置额度')}
                              className="rounded-md bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
                              title="清零本月已用次数"
                            >
                              重置额度
                            </button>
                            {u.role === 'user' && (
                              <button
                                onClick={() => act(u.id, () => adminApi.setAdmin(u.id), '已设为管理员')}
                                className="rounded-md bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-600 hover:bg-sky-500/20"
                              >
                                设为管理员
                              </button>
                            )}
                            {u.role === 'admin' && (
                              <button
                                onClick={() => act(u.id, () => adminApi.unsetAdmin(u.id), '已取消管理员')}
                                className="rounded-md bg-fire/10 px-2.5 py-1 text-[11px] font-medium text-fire hover:bg-fire/20"
                              >
                                取消管理员
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm text-ink-600 shadow-sm hover:bg-ink-50 disabled:opacity-40 dark:bg-ink-900 dark:text-ink-300"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </button>
          <span className="text-sm text-ink-500">
            {page} / {totalPages}
          </span>
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm text-ink-600 shadow-sm hover:bg-ink-50 disabled:opacity-40 dark:bg-ink-900 dark:text-ink-300"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

/** 审计日志（仅超级管理员） */
function LogsPanel() {
  const [logs, setLogs] = useState<AdminLogView[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.logs();
      setLogs(r.logs);
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === logs.length ? new Set() : new Set(logs.map((l) => l.id)),
    );
  };

  const removeLogs = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const r = await adminApi.deleteLogs(ids);
      toastSuccess(`已删除 ${r.deleted} 条审计日志`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const clearAll = async () => {
    if (
      !window.confirm(
        `确定清空全部 ${logs.length} 条审计日志吗？此操作不可恢复。`,
      )
    )
      return;
    setDeleting(true);
    try {
      const r = await adminApi.clearLogs();
      toastSuccess(`已清空 ${r.deleted} 条审计日志`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '清空失败');
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          高风险操作审计记录，共 {logs.length} 条
        </p>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              onClick={() => removeLogs([...selected])}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-40"
            >
              {deleting ? '删除中…' : `删除选中(${selectedCount})`}
            </button>
          )}
          {logs.length > 0 && (
            <button
              onClick={clearAll}
              disabled={deleting}
              className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 hover:bg-red-200 disabled:opacity-40 dark:bg-red-900/40 dark:text-red-300"
            >
              清空全部
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-600 hover:bg-ink-200 disabled:opacity-40 dark:bg-ink-800 dark:text-ink-300"
          >
            {loading ? '加载中…' : '刷新'}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-3 text-4xl opacity-40">📜</div>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            暂无审计记录。订单确认、用户封禁、角色变更等高风险操作都会记录在这里。
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 text-ink-500 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-400">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedCount === logs.length}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-emerald-600"
                    aria-label="全选"
                  />
                </th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">操作人</th>
                <th className="px-4 py-3 font-medium">操作</th>
                <th className="px-4 py-3 font-medium">对象</th>
                <th className="px-4 py-3 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => toggle(l.id)}
                  className={`cursor-pointer border-b border-ink-100 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/30 ${
                    selected.has(l.id)
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggle(l.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      aria-label="选择"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    {new Date(l.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="sky">{l.adminEmail}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="amber">{ACTION_LABEL[l.action] ?? l.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-300">
                    {l.targetUserEmail ?? l.targetOrderId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-400">
                    {l.detail ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 成本统计（仅超级管理员） */
function CostPanel() {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await adminApi.costStats());
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-ink-400">加载中…</p>
      </div>
    );
  }

  return (
    <div>
      {/* 概览卡片 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="今日成本"
          value={fmtCny(stats.today.costCny)}
          icon="📈"
          accent={stats.today.costCny > 0 ? 'fire' : 'ink'}
          sub={`${fmtNum(stats.today.calls)} 次调用 · ${fmtNum(stats.today.totalTokens)} Token`}
        />
        <StatCard
          label="本月成本"
          value={fmtCny(stats.month.costCny)}
          icon="📊"
          accent="fire"
          sub={`${fmtNum(stats.month.calls)} 次调用 · ${fmtNum(stats.month.totalTokens)} Token`}
        />
        <StatCard
          label="累计成本"
          value={fmtCny(stats.total.costCny)}
          icon="💰"
          accent="wood"
          sub={`${fmtNum(stats.total.calls)} 次调用 · ${fmtNum(stats.total.totalTokens)} Token`}
        />
      </div>

      {/* 按模型拆分 */}
      <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
          按模型拆分
        </h2>
        {stats.byModel.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">暂无数据。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                  <th className="px-2 py-2 pr-4 font-medium">模型</th>
                  <th className="px-2 py-2 pr-4 text-right font-medium">调用</th>
                  <th className="px-2 py-2 pr-4 text-right font-medium">输入 Token</th>
                  <th className="px-2 py-2 pr-4 text-right font-medium">输出 Token</th>
                  <th className="px-2 py-2 text-right font-medium">成本</th>
                </tr>
              </thead>
              <tbody>
                {stats.byModel.map((m) => (
                  <tr
                    key={m.model}
                    className="border-b border-ink-100 dark:border-ink-800"
                  >
                    <td className="px-2 py-2 pr-4">
                      <Badge color="sky">{m.model}</Badge>
                    </td>
                    <td className="px-2 py-2 pr-4 text-right font-mono text-base font-semibold text-ink-600 dark:text-ink-400">
                      {fmtNum(m.calls)}
                    </td>
                    <td className="px-2 py-2 pr-4 text-right font-mono text-base font-semibold text-ink-600 dark:text-ink-400">
                      {fmtNum(m.promptTokens)}
                    </td>
                    <td className="px-2 py-2 pr-4 text-right font-mono text-base font-semibold text-ink-600 dark:text-ink-400">
                      {fmtNum(m.completionTokens)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-base font-bold text-amber-600">
                      {fmtCny(m.costCny)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 用户成本排行 */}
      <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="font-serif text-base font-bold text-ink-900 dark:text-ink-100">
          用户成本排行（Top 20）
        </h2>
        {stats.topUsers.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">暂无数据。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                  <th className="px-2 py-2 pr-4 font-medium">用户</th>
                  <th className="px-2 py-2 pr-4 font-medium">套餐</th>
                  <th className="px-2 py-2 pr-4 text-right font-medium">报告/问答</th>
                  <th className="px-2 py-2 pr-4 text-right font-medium">累计 Token</th>
                  <th className="px-2 py-2 text-right font-medium">累计成本</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((u) => (
                  <tr
                    key={u.userId}
                    className="border-b border-ink-100 transition-colors hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/30"
                  >
                    <td className="px-2 py-2 pr-4 text-ink-700 dark:text-ink-300">
                      {u.email}
                    </td>
                    <td className="px-2 py-2 pr-4">
                      {u.plan === 'pro' ? (
                        <Badge color="wood">PRO</Badge>
                      ) : (
                        <Badge color="ink">FREE</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 pr-4 text-right font-mono text-base font-semibold text-ink-600 dark:text-ink-400">
                      {u.usedReportCalls}/{u.usedAskCalls}
                    </td>
                    <td className="px-2 py-2 pr-4 text-right font-mono text-base font-bold text-ink-900 dark:text-ink-100">
                      {fmtNum(u.lifetimeTokens)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-base font-bold text-amber-600">
                      {fmtCny(u.lifetimeCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** 侧边栏菜单项 */
interface MenuItem {
  key: 'orders' | 'users' | 'logs' | 'cost';
  label: string;
  icon: string;
  superOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'orders', label: '订单管理', icon: '🧾' },
  { key: 'users', label: '用户管理', icon: '👥', superOnly: true },
  { key: 'logs', label: '审计日志', icon: '📜', superOnly: true },
  { key: 'cost', label: '成本统计', icon: '📊', superOnly: true },
];

const PANEL_TITLE: Record<MenuItem['key'], string> = {
  orders: '订单管理',
  users: '用户管理',
  logs: '审计日志',
  cost: '成本统计',
};

/**
 * 管理后台：双角色（超级/普通管理员），左侧边栏 + 右侧内容区。
 * - 普通管理员(admin)：仅订单
 * - 超级管理员(super_admin)：订单、用户、审计日志、成本统计
 */
export default function AdminPage() {
  const { email, role, logout } = useAdminStore();
  const [tab, setTab] = useState<MenuItem['key']>('orders');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 客户端挂载标记：避免 SSR 与客户端 hydration 时读取 localStorage 不一致
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !email || !role) {
    return <AdminLogin />;
  }

  const isSuper = role === 'super_admin';
  const visibleMenus = MENU_ITEMS.filter((m) => !m.superOnly || isSuper);

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== 左侧边栏 ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink-900 text-ink-200 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 区 */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="logoCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* 外圆 */}
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#logoRing)" strokeWidth="1.8" opacity="0.95" filter="url(#logoGlow)" />
              {/* 内圆 */}
              <circle cx="24" cy="24" r="14" fill="none" stroke="url(#logoRing)" strokeWidth="1.2" opacity="0.6" />
              {/* 八卦方位线 */}
              <g stroke="#fbbf24" strokeWidth="0.8" opacity="0.55" strokeLinecap="round">
                <line x1="24" y1="4" x2="24" y2="10" />
                <line x1="24" y1="38" x2="24" y2="44" />
                <line x1="4" y1="24" x2="10" y2="24" />
                <line x1="38" y1="24" x2="44" y2="24" />
                <line x1="10" y1="10" x2="14.2" y2="14.2" />
                <line x1="33.8" y1="33.8" x2="38" y2="38" />
                <line x1="38" y1="10" x2="33.8" y2="14.2" />
                <line x1="14.2" y1="33.8" x2="10" y2="38" />
              </g>
              {/* 中心点 - 太极 */}
              <circle cx="24" cy="24" r="6" fill="url(#logoCenter)" filter="url(#logoGlow)" />
              <circle cx="24" cy="21" r="1.2" fill="#0c0a09" />
              <circle cx="24" cy="27" r="1.2" fill="#fde68a" />
              {/* 四角小点 - 五行 */}
              <circle cx="24" cy="6" r="1.6" fill="#ef4444" opacity="0.9" />
              <circle cx="42" cy="24" r="1.6" fill="#22c55e" opacity="0.9" />
              <circle cx="24" cy="42" r="1.6" fill="#fbbf24" opacity="0.9" />
              <circle cx="6" cy="24" r="1.6" fill="#3b82f6" opacity="0.9" />
              <circle cx="36" cy="36" r="1.2" fill="#a1a1aa" opacity="0.9" />
            </svg>
          </div>
          <div>
            <p className="font-serif text-sm font-bold text-white tracking-wide">玄机命盘</p>
            <p className="text-[11px] text-amber-300/70 tracking-wider">管理后台</p>
          </div>
        </div>

        {/* 菜单区 */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleMenus.map((m) => {
            const active = tab === m.key;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setTab(m.key);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-wood text-white shadow-sm shadow-wood/30'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 底部管理员区 */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wood/20 text-sm font-bold text-wood">
              {(email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{email}</p>
              <p className="text-[11px] text-ink-400">
                {isSuper ? '超级管理员' : '普通管理员'}
              </p>
            </div>
            <button
              onClick={logout}
              title="退出登录"
              className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部栏：移动端汉堡 + 当前菜单标题 */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/80 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-ink-200 p-2 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 lg:hidden"
          >
            ☰
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold text-ink-900 dark:text-ink-100">
              {PANEL_TITLE[tab]}
            </h1>
            <p className="hidden text-xs text-ink-500 sm:block dark:text-ink-400">
              {isSuper ? '超级管理员' : '普通管理员'} · {email}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {!isSuper && (
            <p className="mb-4 rounded-lg bg-wood/10 px-3 py-2 text-xs text-wood">
              普通管理员仅可管理订单；用户、审计日志、成本统计仅超级管理员可见。
            </p>
          )}
          {tab === 'orders' && <OrdersPanel />}
          {tab === 'users' && isSuper && <UsersPanel />}
          {tab === 'logs' && isSuper && <LogsPanel />}
          {tab === 'cost' && isSuper && <CostPanel />}
        </main>
      </div>

      {/* 全局 Toast 通知 */}
      <ToastContainer />
    </div>
  );
}