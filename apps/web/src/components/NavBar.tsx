'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

/**
 * 顶部导航栏。展示登录态与主要入口。
 */
export function NavBar() {
  const { email, ready, hydrate, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) hydrate();
  }, [ready, hydrate]);

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
          <span className="text-xl">🔮</span> 玄机 · 八字命术
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {email ? (
            <>
              <Link href="/dashboard" className="btn-ghost">
                我的命盘
              </Link>
              <span className="hidden text-ink-400 sm:inline">{email}</span>
              <button className="btn-ghost" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                登录
              </Link>
              <Link href="/login?mode=register" className="btn-primary">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
