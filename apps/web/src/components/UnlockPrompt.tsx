'use client';

import Link from 'next/link';
import { useBillingStore } from '@/lib/billingStore';

/**
 * 解锁引导卡片：免费用户在报告/问答等 pro 能力处展示，
 * 引导其前往解锁页完成扫码付款。
 */
export function UnlockPrompt({
  title = '解锁完整版',
  desc = '解锁后即可无限次使用 AI 完整解读与命盘问答。',
  compact = false,
}: {
  title?: string;
  desc?: string;
  compact?: boolean;
}) {
  const unlock = useBillingStore((s) => s.unlock);
  const price = unlock?.price ?? 9.9;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-fire/40 bg-fire/5 px-6 text-center ${
        compact ? 'py-6' : 'py-12'
      }`}
    >
      <div className="mb-3 text-4xl">🔒</div>
      <p className="font-serif text-lg font-semibold text-ink-900 dark:text-ink-100">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{desc}</p>
      <Link
        href="/billing"
        className="mt-4 rounded-xl bg-gradient-to-r from-fire to-wood px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
      >
        扫码解锁 · ¥{Number(price).toFixed(2)}
      </Link>
    </div>
  );
}