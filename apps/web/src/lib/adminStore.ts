import { create } from 'zustand';
import { adminApi, adminTokenStore, ApiError, type AdminLoginResult } from './api';

const ADMIN_ROLE_KEY = 'destiny.adminRole';
const ADMIN_EMAIL_KEY = 'destiny.adminEmail';

interface AdminSessionState {
  /** 管理员邮箱；null 表示未登录 */
  email: string | null;
  role: 'admin' | 'super_admin' | null;
  /** 登录中 */
  loggingIn: boolean;
  error: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

function loadSession(): { email: string | null; role: 'admin' | 'super_admin' | null } {
  if (typeof window === 'undefined') return { email: null, role: null };
  const email = localStorage.getItem(ADMIN_EMAIL_KEY);
  const role = localStorage.getItem(ADMIN_ROLE_KEY) as 'admin' | 'super_admin' | null;
  return { email, role };
}

/**
 * 管理员会话（独立于普通用户会话）。
 * 登录走 /admin/login，令牌存于独立的 adminAccessToken，与用户 token 隔离。
 */
export const useAdminStore = create<AdminSessionState>((set) => ({
  ...loadSession(),
  loggingIn: false,
  error: '',

  async login(email, password) {
    set({ loggingIn: true, error: '' });
    try {
      const res: AdminLoginResult = await adminApi.login(email, password);
      adminTokenStore.set(res.accessToken);
      localStorage.setItem(ADMIN_ROLE_KEY, res.admin.role);
      localStorage.setItem(ADMIN_EMAIL_KEY, res.admin.email);
      set({
        email: res.admin.email,
        role: res.admin.role,
        loggingIn: false,
        error: '',
      });
      return true;
    } catch (e) {
      set({
        error: e instanceof ApiError ? e.message : '登录失败',
        loggingIn: false,
      });
      return false;
    }
  },

  logout() {
    adminTokenStore.clear();
    localStorage.removeItem(ADMIN_ROLE_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    set({ email: null, role: null, error: '' });
  },
}));