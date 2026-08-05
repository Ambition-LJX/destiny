'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore, type Theme } from '@/lib/themeStore';
import { useBillingStore } from '@/lib/billingStore';

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'system', label: '跟随系统', icon: '💻' },
];

/**
 * 顶部导航栏。展示登录态与主要入口。
 * 融入玄学五行的神秘设计风格，使用五行背景图片。
 */
export function NavBar() {
  const { email, ready, hydrate, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const plan = useBillingStore((s) => s.plan);
  const refreshBilling = useBillingStore((s) => s.refresh);
  const router = useRouter();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!ready) hydrate();
  }, [ready, hydrate]);

  // 登录后拉取一次套餐状态，用于导航栏展示解锁/Pro 标识
  useEffect(() => {
    if (email) refreshBilling();
  }, [email, refreshBilling]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  function handleLogout() {
    logout();
    router.push('/');
  }

  const currentTheme = THEME_OPTIONS.find((t) => t.value === theme) ?? THEME_OPTIONS[2];
  const isDark = mounted && theme === 'dark';

  return (
    <header
      className={`
        sticky top-0 z-20 backdrop-blur-md animate-nav-bg-flow
        ${isDark
          ? 'border-b border-wood/20'
          : 'border-b border-wood/15'
        }
      `}
      style={{
        backgroundImage: `url('/wuxing-navbar${isDark ? '-dark' : ''}.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 动态五行渐变背景层 - 增强流动感 */}
      <div 
        className={`absolute inset-0 ${isDark ? 'bg-gradient-to-r from-ink-950/30 via-wood/5 to-fire/5' : 'bg-gradient-to-r from-white/15 via-wood/5 to-fire/5'} animate-nav-bg-flow`}
        style={{ mixBlendMode: 'overlay' }}
      />

      {/* 轻量遮罩，保留五行色彩同时确保文字可读 */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-ink-950/20' : 'bg-white/5'}`}
      />

      {/* 顶部五行渐变流光线条 - 动态流动效果 */}
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
        {/* 底层：静态背景条 */}
        <div className={`absolute inset-0 bg-gradient-to-r from-wood via-fire via-earth via-metal via-water to-wood ${isDark ? 'opacity-30' : 'opacity-20'}`} />
        {/* 上层：流动光条 */}
        <div 
          className={`absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent ${isDark ? 'via-wood/60' : 'via-fire/40'} animate-nav-flow`}
        />
      </div>

      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo 区域 - 简洁优雅的八卦设计 */}
        <Link
          href="/"
          className={`group flex items-center gap-3 ${isDark ? 'text-wood' : 'text-ink-900'}`}
        >
          {/* 八卦图标 - 带呼吸光晕 */}
          <div 
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-105 animate-logo-glow ${
              isDark
                ? 'border-wood/40 bg-ink-900/60'
                : 'border-wood/50 bg-white/60'
            }`}
          >
            {/* 太极图案 */}
            <svg viewBox="0 0 40 40" className="h-7 w-7">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
              <path d="M20 2 A18 18 0 0 1 20 38 A9 9 0 0 1 20 20 A9 9 0 0 0 20 2" fill="currentColor" opacity="0.8"/>
              <circle cx="20" cy="11" r="3" fill={isDark ? '#D4AF37' : '#8B5A2B'}/>
              <circle cx="20" cy="29" r="3" fill="currentColor" opacity="0.4"/>
            </svg>
          </div>

          {/* 文字区域 */}
          <div className="flex flex-col">
            <span className={`font-serif text-xl font-bold tracking-wide ${isDark ? 'text-wood' : 'text-ink-900'}`}>
              玄机命盘
            </span>
            <span className={`text-[10px] tracking-[0.25em] ${isDark ? 'text-ink-400' : 'text-ink-500'}`}>
              八字命术 · 趋吉避凶
            </span>
          </div>
        </Link>

        {/* 导航链接 */}
        <nav className="flex items-center gap-1">
          {/* 主题切换 */}
          <div className="relative">
            <button
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${
                isDark
                  ? 'text-ink-300 hover:bg-ink-800/50 hover:text-wood'
                  : 'text-ink-600 hover:bg-wood/10 hover:text-wood'
              }`}
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="切换主题"
            >
              <span className="text-lg">{currentTheme.icon}</span>
              <span className="hidden text-sm font-medium sm:inline">{currentTheme.label}</span>
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${showThemeMenu ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showThemeMenu && (
              <div
                className={`absolute right-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-2xl border backdrop-blur-xl shadow-lg transition-all duration-200 ${
                  isDark
                    ? 'border-wood/30 bg-ink-900/95 shadow-[0_10px_40px_rgba(0,0,0,0.4)]'
                    : 'border-wood/20 bg-white/95 shadow-[0_10px_40px_rgba(63,163,77,0.15)]'
                }`}
              >
                <div className="p-2">
                  {THEME_OPTIONS.map((opt) => {
                    const isActive = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className={`group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200 ${
                          isActive
                            ? 'bg-wood/15 text-wood'
                            : isDark
                              ? 'text-ink-300 hover:bg-ink-800/50'
                              : 'text-ink-600 hover:bg-wood/10'
                        }`}
                        onClick={() => {
                          setTheme(opt.value);
                          setShowThemeMenu(false);
                        }}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                          isActive ? 'bg-wood/20' : isDark ? 'bg-ink-800' : 'bg-ink-100'
                        }`}>
                          {opt.icon}
                        </span>
                        <span className="relative flex-1 font-medium">{opt.label}</span>
                        {isActive && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-wood text-white">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className={`mx-2 h-6 w-px ${isDark ? 'bg-ink-700' : 'bg-ink-200'}`} />

          {email ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isDark
                    ? 'text-ink-300 hover:bg-ink-800/50 hover:text-wood'
                    : 'text-ink-600 hover:bg-wood/10 hover:text-wood'
                }`}
              >
                我的命盘
              </Link>
              {plan === 'pro' ? (
                <span className="rounded-full bg-gradient-to-r from-wood to-fire px-2.5 py-1 text-xs font-semibold text-white">
                  PRO
                </span>
              ) : (
                <Link
                  href="/billing"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                    isDark
                      ? 'border-fire/50 text-fire hover:bg-fire/10'
                      : 'border-fire/40 text-fire hover:bg-fire/10'
                  }`}
                >
                  解锁完整版
                </Link>
              )}
              <span className={`hidden text-xs sm:inline ${isDark ? 'text-ink-500' : 'text-ink-400'}`}>
                {email.split('@')[0]}
              </span>
              <button
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isDark
                    ? 'text-ink-400 hover:bg-fire/10 hover:text-fire'
                    : 'text-ink-500 hover:bg-fire/10 hover:text-fire'
                }`}
                onClick={handleLogout}
              >
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isDark
                    ? 'text-ink-300 hover:bg-ink-800/50 hover:text-wood'
                    : 'text-ink-600 hover:bg-wood/10 hover:text-wood'
                }`}
              >
                登录
              </Link>
              <Link
                href="/login?mode=register"
                className={`rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                  isDark
                    ? 'bg-gradient-to-r from-wood to-fire shadow-wood/30'
                    : 'bg-gradient-to-r from-wood to-fire shadow-wood/20'
                }`}
              >
                注册
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* 底部动态细线 */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-wood/50 to-transparent ${isDark ? 'via-wood/30' : 'via-fire/30'} animate-nav-flow-slow`}
        />
      </div>
    </header>
  );
}
