import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * 主题状态管理。主题设置持久化到 localStorage。
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'destiny-theme',
    },
  ),
);

/**
 * 获取当前应使用的实际主题（解析 system 为 light/dark）。
 */
export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

/**
 * 获取 <html> 元素应添加的 class。
 */
export function getThemeClass(theme: Theme): string {
  const resolved = getResolvedTheme(theme);
  return resolved === 'dark' ? 'dark' : '';
}
