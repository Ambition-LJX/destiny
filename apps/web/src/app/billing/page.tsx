'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useBillingStore } from '@/lib/billingStore';
import { billingApi, type PayOrder } from '@/lib/api';

/**
 * 解锁页（微信/支付宝扫码代收）。
 * 流程：查看价格与收款码 → 生成订单号 → 扫码付款 → 联系客服/在订单中等待
 * 管理端确认 → 开通完整版。
 */
export default function BillingPage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();
  const { plan, proExpiresAt, unlock, refresh } = useBillingStore();
  const [orders, setOrders] = useState<PayOrder[]>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (authed) {
      refresh();
      billingApi.myOrders().then(setOrders).catch(() => {});
    }
  }, [authed, refresh]);

  if (!ready) return <div className="p-10 text-center text-ink-400">加载中…</div>;
  if (!authed) return null;

  const isPro = plan === 'pro';
  const price = Number(unlock?.price ?? 9.9).toFixed(2);
  const hasQr = unlock?.qrWechat || unlock?.qrAlipay;

  async function handleOrder() {
    setCreating(true);
    setNotice('');
    try {
      const order = await billingApi.createOrder();
      setOrders([order, ...orders]);
      setNotice('请使用微信/支付宝扫码支付，并牢记订单号。支付后联系客服或等待管理员确认开通。');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '下单失败，请重试');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">
        解锁完整版
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        解锁后即可无限次使用 AI 完整解读与命盘问答。
      </p>

      {/* 当前套餐状态 */}
      <div className="mt-6 rounded-2xl border border-wood/20 bg-white/60 p-5 dark:bg-ink-900/40">
        {isPro ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <p className="font-semibold text-wood">已解锁完整版</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {proExpiresAt
                  ? `有效期至 ${new Date(proExpiresAt).toLocaleDateString('zh-CN')}`
                  : '永久有效'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔓</span>
            <div>
              <p className="font-semibold text-ink-900 dark:text-ink-100">
                当前为免费版
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-500 dark:text-ink-400">
                <li>免费排盘 + 每月 1 次整体概览解读</li>
                <li>完整维度解读与命盘问答需解锁</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {!isPro && (
        <>
          {/* 价格与收款码 */}
          <div className="mt-6 rounded-2xl border border-fire/20 bg-white/60 p-6 text-center dark:bg-ink-900/40">
            <p className="text-sm text-ink-500 dark:text-ink-400">完整版解锁价</p>
            <p className="mt-1 font-serif text-4xl font-bold text-fire">¥{price}</p>
            <p className="mt-1 text-xs text-ink-400">
              {unlock?.proDays ? `解锁后有效期 ${unlock.proDays} 天` : '一次性解锁，永久使用'}
            </p>

            {hasQr ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                {unlock.qrWechat && (
                  <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-200">微信支付</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={unlock.qrWechat}
                      alt="微信收款码"
                      className="mx-auto h-40 w-40 rounded-lg object-contain"
                    />
                  </div>
                )}
                {unlock.qrAlipay && (
                  <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-200">支付宝</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={unlock.qrAlipay}
                      alt="支付宝收款码"
                      className="mx-auto h-40 w-40 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-400">
                收款码尚未配置，请联系运营开通扫码代收。
              </p>
            )}

            {unlock?.contact && (
              <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">
                客服：{unlock.contact}
              </p>
            )}

            <button
              onClick={handleOrder}
              disabled={creating}
              className="mt-5 rounded-xl bg-gradient-to-r from-fire to-wood px-6 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-60"
            >
              {creating ? '生成中…' : '生成解锁订单'}
            </button>
            {notice && <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">{notice}</p>}
          </div>

          {/* 我的订单 */}
          {orders.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">我的订单</h2>
              <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 dark:bg-ink-900/60 text-left text-ink-500 dark:text-ink-400">
                    <tr>
                      <th className="px-4 py-2">订单号</th>
                      <th className="px-4 py-2">金额</th>
                      <th className="px-4 py-2">状态</th>
                      <th className="px-4 py-2">下单时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-ink-100 dark:border-ink-800">
                        <td className="px-4 py-2 font-mono text-xs">{o.orderNo}</td>
                        <td className="px-4 py-2">¥{Number(o.amount).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          {o.status === 'paid' ? (
                            <span className="text-wood">已开通</span>
                          ) : o.status === 'cancelled' ? (
                            <span className="text-ink-400">已取消</span>
                          ) : (
                            <span className="text-fire">待确认</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-ink-400">
                          {new Date(o.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}