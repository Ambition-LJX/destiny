'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { ApiError } from '@/lib/api';

/**
 * 登录 / 注册页。通过 ?mode=register 切换。
 */
function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get('mode');

  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();

  // URL 上的 mode 变化时同步表单模式（如在登录页点击“注册”链接）。
  useEffect(() => {
    setIsRegister(mode === 'register');
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* 五行光晕装饰 */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-wood/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-10 h-64 w-64 rounded-full bg-fire/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-water/15 blur-3xl" />

      <div className="card relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 font-serif text-lg font-semibold text-ink-900 dark:text-ink-100"
        >
          <svg viewBox="0 0 40 40" className="h-7 w-7 text-wood">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <path
              d="M20 2 A18 18 0 0 1 20 38 A9 9 0 0 1 20 20 A9 9 0 0 0 20 2"
              fill="currentColor"
              opacity="0.8"
            />
            <circle cx="20" cy="11" r="3" fill="#C8952F" />
            <circle cx="20" cy="29" r="3" fill="currentColor" opacity="0.4" />
          </svg>
          玄机 · 八字命术
        </Link>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">
          {isRegister ? '创建账户' : '欢迎回来'}
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {isRegister ? '注册以保存你的命盘档案' : '登录以查看你的命盘与解读'}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">邮箱</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">密码</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : 1}
              placeholder={isRegister ? '至少 8 位' : '请输入密码'}
            />
          </div>

          {error && <p className="text-sm text-fire">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '处理中…' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-500 dark:text-ink-400">
          {isRegister ? '已有账户？' : '还没有账户？'}
          <button
            className="ml-1 font-medium text-wood hover:underline"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-400">加载中…</div>}>
      <LoginInner />
    </Suspense>
  );
}
