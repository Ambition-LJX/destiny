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
 * 先天八卦（乾兑离震巽坎艮坤，顺时针），每卦三爻：1 = 阳(实线)，0 = 阴(断线)。
 * 用于导航栏背景水印，替代此前花哨的五色拼接底图。
 */
const TRIGRAMS: [number, number, number][] = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
  [1, 0, 0],
  [0, 1, 1],
  [0, 1, 0],
  [0, 0, 1],
  [0, 0, 0],
];

/**
 * 罗盘八卦纹水印：作为导航栏的低调背景装饰。
 * 取意罗盘 / 印玺，克制的墨金配色，替代此前杂乱的五行拼色底图。
 */
function BaguaMark({ className }: { className?: string }) {
  const outerR = 70;
  const gap = 7;
  const lineLen = 32;
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden focusable="false">
      <circle cx="0" cy="0" r="88" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="0" cy="0" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" />
      {/* 太极 */}
      <path d="M0 -22 A22 22 0 0 1 0 22 A11 11 0 0 1 0 0 A11 11 0 0 0 0 -22" fill="currentColor" />
      {/* 八卦环 */}
      {TRIGRAMS.map((bits, i) => (
        <g key={i} transform={`rotate(${i * 45})`}>
          {bits.map((bit, j) => {
            const y = -(outerR + (j - 1) * gap);
            return bit === 1 ? (
              <line
                key={j}
                x1={-lineLen / 2}
                y1={y}
                x2={lineLen / 2}
                y2={y}
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            ) : (
              <g key={j}>
                <line x1={-lineLen / 2} y1={y} x2={-4} y2={y} stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                <line x1={4} y1={y} x2={lineLen / 2} y2={y} stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/**
 * 顶部导航栏。
 * 设计基调：墨黑 · 赭金 · 朱砂——取意罗盘与印玺，
 * 以克制的玄学色彩替代此前杂乱的五行拼色背景。
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
      className={`sticky top-0 z-20 overflow-hidden border-b backdrop-blur-xl ${
        isDark ? 'border-metal/20 bg-ink-950/90' : 'border-earth/20 bg-white/90'
      }`}
    >
      {/* 罗盘八卦纹水印：居中露出中段，克制而有玄学意象 */}
      <BaguaMark
        className={`pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 ${
          isDark ? 'text-metal/[0.09]' : 'text-earth/[0.08]'
        }`}
      />

      {/* 顶部向下的暗角光晕，增强纵深与仪式感 */}
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(212,175,55,0.08),transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(200,149,47,0.10),transparent_70%)]'
        }`}
      />

      {/* 顶部描金细线 + 流光 */}
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className={`absolute inset-0 ${isDark ? 'bg-metal/25' : 'bg-earth/25'}`} />
        <div className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-metal to-transparent opacity-70 animate-nav-shimmer" />
      </div>

      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo：铜钱印玺徽记 */}
        <Link href="/" className="group flex items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 animate-seal-glow ${
              isDark ? 'border-metal/50 bg-ink-900/70 text-metal' : 'border-earth/50 bg-white/70 text-earth'
            }`}
          >
            <svg viewBox="0 0 40 40" className="h-7 w-7">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
              <path d="M20 2 A18 18 0 0 1 20 38 A9 9 0 0 1 20 20 A9 9 0 0 0 20 2" fill="currentColor" opacity="0.85" />
              <circle cx="20" cy="11" r="3" fill={isDark ? '#141821' : '#ffffff'} />
              <circle cx="20" cy="29" r="3" fill="currentColor" opacity="0.4" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className={`font-serif text-xl font-bold tracking-wide ${isDark ? 'text-ink-100' : 'text-ink-900'}`}>
              玄机命盘
            </span>
            <span className={`text-[10px] tracking-[0.28em] ${isDark ? 'text-metal/70' : 'text-earth/80'}`}>
              八字命术 · 趋吉避凶
            </span>
          </div>
        </Link>

        {/* 导航区 */}
        <nav className="flex items-center gap-1">
          {/* 主题切换 */}
          <div className="relative">
            <button
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                isDark ? 'text-ink-300 hover:bg-metal/10 hover:text-metal' : 'text-ink-600 hover:bg-earth/10 hover:text-earth'
              }`}
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="切换主题"
            >
              <span className="text-base">{currentTheme.icon}</span>
              <span className="hidden font-medium sm:inline">{currentTheme.label}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${showThemeMenu ? 'rotate-180' : ''}`}
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
                className={`absolute right-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-xl border shadow-xl backdrop-blur-xl ${
                  isDark
                    ? 'border-metal/25 bg-ink-900/95 shadow-[0_10px_40px_rgba(0,0,0,0.4)]'
                    : 'border-earth/20 bg-white/95 shadow-[0_10px_40px_rgba(200,149,47,0.15)]'
                }`}
              >
                <div className="p-1.5">
                  {THEME_OPTIONS.map((opt) => {
                    const isActive = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 ${
                          isActive
                            ? isDark
                              ? 'bg-metal/15 text-metal'
                              : 'bg-earth/10 text-earth'
                            : isDark
                              ? 'text-ink-300 hover:bg-ink-800/60'
                              : 'text-ink-600 hover:bg-ink-50'
                        }`}
                        onClick={() => {
                          setTheme(opt.value);
                          setShowThemeMenu(false);
                        }}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span className="flex-1 font-medium">{opt.label}</span>
                        {isActive && (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className={`mx-2 h-5 w-px ${isDark ? 'bg-ink-700' : 'bg-ink-200'}`} />

          {email ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  isDark ? 'text-ink-300 hover:bg-metal/10 hover:text-metal' : 'text-ink-600 hover:bg-earth/10 hover:text-earth'
                }`}
              >
                我的命盘
              </Link>
              {plan === 'pro' ? (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-metal to-fire px-2.5 py-1 text-xs font-semibold text-white shadow-sm shadow-fire/30">
                  玺 · PRO
                </span>
              ) : (
                <Link
                  href="/billing"
                  className="rounded-full border border-metal/50 px-3 py-1 text-xs font-semibold text-fire transition-colors duration-200 hover:bg-fire/10"
                >
                  解锁完整版
                </Link>
              )}
              <span className={`hidden text-xs sm:inline ${isDark ? 'text-ink-500' : 'text-ink-400'}`}>
                {email.split('@')[0]}
              </span>
              <button
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  isDark ? 'text-ink-400 hover:bg-fire/10 hover:text-fire' : 'text-ink-500 hover:bg-fire/10 hover:text-fire'
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
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  isDark ? 'text-ink-300 hover:bg-metal/10 hover:text-metal' : 'text-ink-600 hover:bg-earth/10 hover:text-earth'
                }`}
              >
                登录
              </Link>
              <Link
                href="/login?mode=register"
                className="relative overflow-hidden rounded-lg bg-gradient-to-r from-metal to-fire px-5 py-2 text-sm font-semibold text-white shadow-md shadow-earth/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-fire/30"
              >
                注册
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* 底部描金细线 */}
      <div className={`absolute inset-x-0 bottom-0 h-px ${isDark ? 'bg-metal/15' : 'bg-earth/15'}`} />
    </header>
  );
}
