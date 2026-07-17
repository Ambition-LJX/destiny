'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

/**
 * 登录守卫：未登录时跳转到登录页。
 * 返回是否已就绪（可渲染受保护内容）。
 */
export function useRequireAuth(): { ready: boolean; authed: boolean } {
  const { email, ready, hydrate } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      hydrate();
      return;
    }
    if (!email) {
      router.replace('/login');
    }
  }, [ready, email, hydrate, router]);

  return { ready, authed: !!email };
}
