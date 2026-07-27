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
async function request<T>(
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

  const json = (await res.json()) as ApiResponse<T>;

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
export const reportApi = {
  list: (chartId: string) => request<StoredReport[]>(`/reports/${chartId}`),
  /**
   * 一次性生成全部（或指定）维度的报告。
   */
  generateAll: (chartId: string, dimensions?: string[]) => {
    const body: { chartId: string; dimensions?: string[] } = { chartId };
    if (dimensions?.length) body.dimensions = dimensions;
    return request<{ disclaimer: string; reports: BatchReportItem[] }>(
      '/reports/generate',
      { method: 'POST', body: JSON.stringify(body) },
    );
  },
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
  init: { method: 'GET' | 'POST'; body?: unknown },
  handlers: {
    onDelta: (text: string) => void;
    onDone?: (disclaimer?: string) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const headers = new Headers();
  const access = tokenStore.access;
  if (access) headers.set('Authorization', `Bearer ${access}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError?.(`流式请求失败(${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
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
}
