import type {
  ApiResponse,
  AuthTokens,
  BatchReportItem,
  ChartResult,
  CreateProfilePayload,
  ProfileView,
  StoredReport,
} from './types';

/**
 * API 基础地址。浏览器端默认走同源 /api（由 Next rewrites 代理到后端）。
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';

const ACCESS_KEY = 'destiny.accessToken';
const REFRESH_KEY = 'destiny.refreshToken';

/**
 * 令牌本地存取。
 */
export const tokenStore = {
  get access(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * 令牌过期时的回调（由 authStore 注册），用于同步前端登录态。
 */
let onAuthCleared: (() => void) | null = null;

export function setOnAuthCleared(handler: (() => void) | null): void {
  onAuthCleared = handler;
}

/**
 * 用 refresh token 换发新令牌。成功返回新的 access token，失败清除本地令牌并返回 null。
 * 并发请求共享同一次刷新，避免重复调用刷新接口。
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        const json = (await res.json()) as ApiResponse<AuthTokens>;
        if (!res.ok || json.code !== 0) return null;
        tokenStore.set(json.data);
        return json.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  const token = await refreshPromise;
  if (!token) {
    tokenStore.clear();
    onAuthCleared?.();
  }
  return token;
}

/**
 * 统一请求封装，自动带上 access token 并解包 { code, message, data }。
 * 遇到 401 时用 refresh token 刷新后自动重试一次。
 */
export async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const access = tokenStore.access;
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry && tokenStore.refresh) {
    const newAccess = await refreshTokens();
    if (newAccess) {
      return request<T>(path, options, false);
    }
  }

  const body = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(body) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      `请求失败(${res.status})：${body.slice(0, 200)}`,
      res.status,
    );
  }

  if (!res.ok || json.code !== 0) {
    throw new ApiError(json.message || `请求失败(${res.status})`, res.status);
  }
  return json.data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 认证接口。
 */
export const authApi = {
  register: (email: string, password: string) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  refresh: (refreshToken: string) =>
    request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

/**
 * 档案接口。
 */
export const profileApi = {
  create: (payload: CreateProfilePayload) =>
    request<ProfileView>('/profiles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  list: () => request<ProfileView[]>('/profiles'),
  get: (id: string) => request<ProfileView>(`/profiles/${id}`),
  remove: (id: string) =>
    request<{ deleted: boolean }>(`/profiles/${id}`, { method: 'DELETE' }),
  exportAll: () => request<unknown>('/profiles/export/all'),
};

/**
 * 排盘接口。
 */
export const chartApi = {
  calculate: (profileId: string) =>
    request<ChartResult>('/charts/calculate', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    }),
  get: (chartId: string) => request<ChartResult>(`/charts/${chartId}`),
};

/**
 * 报告接口（非流式聚合 + 历史）。
 */
export interface BatchGenerateResponse {
  disclaimer: string;
  reports: BatchReportItem[];
  llmMeta?: { provider: string; model: string; cacheHits: number; total: number };
}

/** 单条命盘问答历史记录 */
export interface ChatMessageView {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const reportApi = {
  list: (chartId: string) => request<StoredReport[]>(`/reports/${chartId}`),
  /**
   * 读取某排盘的问答历史（刷新后恢复记忆）。
   */
  chatList: (chartId: string) =>
    request<ChatMessageView[]>(`/reports/${chartId}/chat`),
  /**
   * 一次性生成全部（或指定）维度的报告。
   */
  generateAll: (chartId: string, dimensions?: string[]) => {
    const body: { chartId: string; dimensions?: string[] } = { chartId };
    if (dimensions?.length) body.dimensions = dimensions;
    return request<BatchGenerateResponse>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

/** 成本统计桶（成本单位：人民币） */
export interface CostBucket {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCny: number;
}

/** 成本统计结果 */
export interface CostStats {
  today: CostBucket;
  month: CostBucket;
  total: CostBucket;
  byModel: Array<{ model: string } & CostBucket>;
  topUsers: Array<{
    userId: string;
    email: string;
    plan: string;
    lifetimeTokens: number;
    lifetimeCost: number;
    usedReportCalls: number;
    usedAskCalls: number;
  }>;
}

/**
 * 管理接口（运营看板）。使用独立的管理员令牌（/admin/login 签发）。
 */
const ADMIN_ACCESS_KEY = 'destiny.adminAccessToken';

/** 管理员令牌存取（与普通用户令牌完全隔离）。 */
export const adminTokenStore = {
  get get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ADMIN_ACCESS_KEY);
  },
  set(token: string) {
    localStorage.setItem(ADMIN_ACCESS_KEY, token);
  },
  clear() {
    localStorage.removeItem(ADMIN_ACCESS_KEY);
  },
};

/** 管理员请求封装：自动带管理员令牌，解包 { code, message, data }。 */
export async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = adminTokenStore.get;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(body) as ApiResponse<T>;
  } catch {
    throw new ApiError(`请求失败(${res.status})：${body.slice(0, 200)}`, res.status);
  }
  if (!res.ok || json.code !== 0) {
    throw new ApiError(json.message || `请求失败(${res.status})`, res.status);
  }
  return json.data;
}

export interface AdminLoginResult {
  accessToken: string;
  admin: { userId: string; email: string; role: 'admin' | 'super_admin' };
}

export interface AdminUserView {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  bannedAt: string | null;
  createdAt: string;
  plan: 'free' | 'pro';
  proExpiresAt: string | null;
  overviewUsed: number;
  overviewFree: number;
  usedReportCalls: number;
  usedAskCalls: number;
  lifetimeTokens: number;
  lifetimeCost: number;
}

export interface AdminUserList {
  total: number;
  page: number;
  pageSize: number;
  users: AdminUserView[];
}

export interface AdminOrderView {
  id: string;
  orderNo: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  email: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminOrderList {
  total: number;
  page: number;
  pageSize: number;
  orders: AdminOrderView[];
}

export interface AdminLogView {
  id: string;
  adminEmail: string;
  action: string;
  targetUserEmail: string | null;
  targetOrderId: string | null;
  detail: string | null;
  createdAt: string;
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminRequest<AdminLoginResult>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  orders: (params: { status?: string; keyword?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.keyword) qs.set('keyword', params.keyword);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return adminRequest<AdminOrderList>(`/admin/orders?${qs.toString()}`);
  },
  createOrder: (params: { email: string; amount?: number; note?: string }) =>
    adminRequest<AdminOrderView & { ok: boolean }>('/admin/orders', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  confirmOrder: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/orders/${id}/confirm`, { method: 'POST' }),
  cancelOrder: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/orders/${id}/cancel`, { method: 'POST' }),
  refundOrder: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/orders/${id}/refund`, { method: 'POST' }),
  updateOrderNote: (id: string, note: string) =>
    adminRequest<{ ok: boolean }>(`/admin/orders/${id}/note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  users: (params: { page?: number; pageSize?: number; keyword?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.keyword) qs.set('keyword', params.keyword);
    return adminRequest<AdminUserList>(`/admin/users?${qs.toString()}`);
  },
  ban: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/ban`, { method: 'POST' }),
  unban: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/unban`, { method: 'POST' }),
  resetQuota: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/reset-quota`, { method: 'POST' }),
  grantPro: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/grant-pro`, { method: 'POST' }),
  revokePro: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/revoke-pro`, { method: 'POST' }),
  setAdmin: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/set-admin`, { method: 'POST' }),
  unsetAdmin: (id: string) =>
    adminRequest<{ ok: boolean }>(`/admin/users/${id}/unset-admin`, { method: 'POST' }),
  logs: (page = 1, pageSize = 30) =>
    adminRequest<{ total: number; page: number; pageSize: number; logs: AdminLogView[] }>(
      `/admin/logs?page=${page}&pageSize=${pageSize}`,
    ),
  deleteLogs: (ids: string[]) =>
    adminRequest<{ ok: boolean; deleted: number }>('/admin/logs/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  clearLogs: () =>
    adminRequest<{ ok: boolean; deleted: number }>('/admin/logs/clear', {
      method: 'POST',
    }),
  costStats: () => adminRequest<CostStats>('/admin/cost-stats'),
};

/** 用户额度信息 */
export interface QuotaInfo {
  plan: 'free' | 'pro';
  proExpiresAt: string | null;
  overview: { free: number; used: number };
  report: { used: number };
  ask: { used: number };
}

/**
 * 额度接口。
 */
export const quotaApi = {
  get: () => request<QuotaInfo>('/reports/quota'),
};

/** 解锁信息 */
export interface UnlockInfo {
  price: number;
  currency: string;
  qrWechat: string;
  qrAlipay: string;
  contact: string;
  proDays: number;
  enabled: boolean;
}

/** 解锁订单 */
export interface PayOrder {
  id: string;
  orderNo: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: string | null;
  createdAt: string;
}

/** 我的套餐状态 */
export interface BillingStatus {
  plan: 'free' | 'pro';
  proExpiresAt: string | null;
  overviewRemaining: number;
  /** 是否已被封禁（软封禁：只读可用，写操作受限） */
  banned?: boolean;
}

/**
 * 解锁（充值）接口。
 */
export const billingApi = {
  unlockInfo: () => request<UnlockInfo>('/billing/unlock-info'),
  status: () => request<BillingStatus>('/billing/status'),
  createOrder: () =>
    request<PayOrder>('/billing/orders', { method: 'POST' }),
  myOrders: () => request<PayOrder[]>('/billing/orders/mine'),
};

/**
 * 流式解读：通过 fetch 读取 SSE，逐段回调。
 *
 * @param path SSE 路径（含 query）
 * @param body POST body（问答用），为空则用 GET
 * @param onDelta 收到文本增量时回调
 * @param onDone 结束回调（附免责声明）
 * @param onError 出错回调
 */
export async function streamSse(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> },
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (disclaimer?: string) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  // 如果调用前已被中断，直接返回
  if (signal?.aborted) {
    return;
  }

  // 统一构建请求头：自动带上 access token（兼容 401 刷新后更换 token）
  const buildHeaders = (access: string | null): Headers => {
    const headers = new Headers();
    if (access) headers.set('Authorization', `Bearer ${access}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers)) {
        headers.set(k, v);
      }
    }
    return headers;
  };

  const doFetch = (access: string | null): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method: init.method,
      headers: buildHeaders(access),
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal,
    });

  let res: Response;
  try {
    res = await doFetch(tokenStore.access);
    // 401：access token 可能已过期（15 分钟），用 refresh token 换发后重试一次
    if (res.status === 401 && tokenStore.refresh) {
      const access = await refreshTokens();
      if (access) {
        res = await doFetch(access);
      }
    }
  } catch (err) {
    // 处理中断或网络错误
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      return; // 静默返回，不触发 error 回调
    }
    handlers.onError?.(err instanceof Error ? err.message : '网络请求失败');
    return;
  }

  if (!res.ok || !res.body) {
    if (signal?.aborted) return;
    handlers.onError?.(`流式请求失败(${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      // 检查是否已被中断
      if (signal?.aborted) {
        break;
      }

      let result: { done: boolean; value?: Uint8Array };
      try {
        result = await reader.read();
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
          break;
        }
        throw err;
      }

      const { done, value } = result;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        // 再次检查中断
        if (signal?.aborted) break;

        try {
          const evt = JSON.parse(payload) as {
            delta?: string;
            done?: boolean;
            disclaimer?: string;
            error?: string;
          };
          if (evt.error) {
            handlers.onError?.(evt.error);
          } else if (evt.done) {
            handlers.onDone?.(evt.disclaimer);
          } else if (evt.delta) {
            handlers.onDelta(evt.delta);
          }
        } catch {
          /* 忽略解析失败的心跳行 */
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}
