import { create } from 'zustand';
import { billingApi, quotaApi, type UnlockInfo } from './api';

interface BillingState {
  /** 当前套餐：null 表示尚未加载 */
  plan: 'free' | 'pro' | null;
  proExpiresAt: string | null;
  /** 免费用户本月剩余的整体概览次数 */
  overviewRemaining: number;
  /** 解锁信息（价格/收款码/客服） */
  unlock: UnlockInfo | null;
  loaded: boolean;
  /** 拉取套餐状态与解锁信息；chart 页每次进入都调用以刷新 plan */
  refresh: () => Promise<void>;
  /** 仅刷新额度（生成/解锁后调用，避免整页刷新） */
  refreshQuotaOnly: () => Promise<void>;
}

/**
 * 套餐/解锁状态（全局）。图表页、报告页、问答页据此做额度拦截与升级引导。
 */
export const useBillingStore = create<BillingState>((set, get) => ({
  plan: null,
  proExpiresAt: null,
  overviewRemaining: 0,
  unlock: null,
  loaded: false,

  async refresh() {
    try {
      const status = await billingApi.status();
      let unlock = get().unlock;
      if (!unlock) {
        try {
          unlock = await billingApi.unlockInfo();
        } catch {
          unlock = null;
        }
      }
      set({
        plan: status.plan,
        proExpiresAt: status.proExpiresAt,
        overviewRemaining: status.overviewRemaining,
        unlock,
        loaded: true,
      });
    } catch {
      // 未登录或加载失败：保持现状
      set({ loaded: true });
    }
  },

  // 本地刷新额度（生成/解锁后调用，避免整页刷新）
  async refreshQuotaOnly() {
    try {
      const q = await quotaApi.get();
      set({
        plan: q.plan,
        proExpiresAt: q.proExpiresAt,
        overviewRemaining: Math.max(q.overview.free - q.overview.used, 0),
        loaded: true,
      });
    } catch {
      /* 忽略 */
    }
  },
}));