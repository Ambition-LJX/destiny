import { create } from 'zustand';
import { authApi, tokenStore, setOnAuthCleared } from './api';
import { decodeJwt, isJwtExpired } from './jwt';
import type { AuthTokens } from './types';

interface AuthState {
  userId: string | null;
  email: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

/**
 * 认证状态管理。令牌持久化在 localStorage，用户信息内存态。
 */
export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  ready: false,

  hydrate() {
    const access = tokenStore.access;
    if (access) {
      const payload = decodeJwt(access);
      // access token 未过期：直接恢复登录态。
      if (payload && !isJwtExpired(access)) {
        set({ userId: payload.sub, email: payload.email, ready: true });
        return;
      }
      // access token 已过期但 refresh token 仍在：保留登录态，
      // 后续 API 请求会在收到 401 时自动刷新令牌。
      if (payload && tokenStore.refresh && !isJwtExpired(tokenStore.refresh)) {
        set({ userId: payload.sub, email: payload.email, ready: true });
        return;
      }
      // 令牌无法解析或全部过期：清除，视为未登录。
      tokenStore.clear();
    }
    set({ userId: null, email: null, ready: true });
  },

  async login(email, password) {
    const tokens: AuthTokens = await authApi.login(email, password);
    tokenStore.set(tokens);
    set({ userId: tokens.user.id, email: tokens.user.email });
  },

  async register(email, password) {
    const tokens: AuthTokens = await authApi.register(email, password);
    tokenStore.set(tokens);
    set({ userId: tokens.user.id, email: tokens.user.email });
  },

  logout() {
    tokenStore.clear();
    set({ userId: null, email: null });
  },
}));

// 令牌刷新失败被清除时，同步重置内存中的登录态，避免“假登录”。
setOnAuthCleared(() => {
  useAuthStore.setState({ userId: null, email: null });
});
