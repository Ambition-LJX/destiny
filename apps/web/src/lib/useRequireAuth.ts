'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './authStore';

/**
 * 登录守卫：未登录时跳转到登录页。
 * 返回是否已就绪（可渲染受保护内容）。
 */
export function useRequireAuth(): { ready: boolean; authed: boolean } {
  const email = useAuthStore((s) => s.email);
  const ready = useAuthStore((s) => s.ready);
  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready && !hydrated) {
      hydrate();
      setHydrated(true);
    }
  }, [ready, hydrated, hydrate]);

  useEffect(() => {
    if (ready && !email) {
      router.replace('/login');
    }
  }, [ready, email, router]);

  return { ready, authed: !!email };
}
