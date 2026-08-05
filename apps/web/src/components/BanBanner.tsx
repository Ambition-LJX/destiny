'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { billingApi } from '@/lib/api';

/**
 * 全局封禁提示横幅。
 * 登录后拉取套餐状态，若账号被封禁（软封禁）则固定在顶部展示提示，
 * 告知用户仍可查看/导出数据，但业务操作受限。
 */
export function BanBanner() {
  const userId = useAuthStore((s) => s.userId);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (!userId) {
      setBanned(false);
      return;
    }
    let cancelled = false;
    billingApi
      .status()
      .then((s) => {
        if (!cancelled) setBanned(!!s.banned);
      })
      .catch(() => {
        if (!cancelled) setBanned(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!banned) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 border-b border-red-200 bg-red-50/95 px-4 py-2.5 shadow-md backdrop-blur dark:border-red-900/60 dark:bg-red-950/90">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
      <p className="text-sm font-medium text-red-700 dark:text-red-200">
        您的账号已被封禁，排盘、解读、问答等业务功能暂不可用。您仍可查看和导出自己的数据，如有疑问请联系客服。
      </p>
    </div>
  );
}