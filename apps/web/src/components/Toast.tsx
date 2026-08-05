'use client';

import { useToastStore } from '@/lib/toast';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const color =
          t.type === 'success'
            ? 'bg-wood text-white'
            : t.type === 'error'
              ? 'bg-fire text-white'
              : 'bg-ink-900 text-white';
        const icon = t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'ⓘ';
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm ${color} animate-[fadeIn_0.2s_ease-out]`}
          >
            <span className="text-base">{icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}