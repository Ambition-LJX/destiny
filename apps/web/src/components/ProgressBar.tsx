'use client';

import type { ReactNode } from 'react';

interface ProgressBarProps {
  /** 进度 0-100，不传则为不确定模式 */
  value?: number;
  /** 显示在进度条上方的标签文字或节点 */
  label?: ReactNode;
  /** 附加的右侧信息（如字符数、耗时等） */
  extra?: ReactNode;
  /** 颜色主题，默认 wood（木-绿色） */
  variant?: 'wood' | 'fire' | 'earth' | 'metal' | 'water' | 'ink';
  /** 尺寸 */
  size?: 'sm' | 'md';
  /** 是否显示百分比 */
  showPercent?: boolean;
  /** 动画类 */
  className?: string;
}

const VARIANT_MAP: Record<string, { bar: string; glow: string; text: string }> = {
  wood: { bar: 'bg-wood', glow: 'shadow-wood/30', text: 'text-wood' },
  fire: { bar: 'bg-fire', glow: 'shadow-fire/30', text: 'text-fire' },
  earth: { bar: 'bg-earth', glow: 'shadow-earth/30', text: 'text-earth' },
  metal: { bar: 'bg-metal', glow: 'shadow-metal/30', text: 'text-metal' },
  water: { bar: 'bg-water', glow: 'shadow-water/30', text: 'text-water' },
  ink: { bar: 'bg-ink-600', glow: 'shadow-ink-400/30', text: 'text-ink-600' },
};

export function ProgressBar({
  value,
  label,
  extra,
  variant = 'wood',
  size = 'md',
  showPercent = false,
  className = '',
}: ProgressBarProps) {
  const v = VARIANT_MAP[variant];
  const heightClass = size === 'sm' ? 'h-1' : 'h-2';
  const roundedClass = size === 'sm' ? 'rounded-full' : 'rounded-full';

  const isDeterminate = typeof value === 'number';
  const clamped = isDeterminate ? Math.min(100, Math.max(0, value!)) : 0;

  return (
    <div className={`w-full ${className}`}>
      {(label || extra) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {label && <span className="text-ink-500 dark:text-ink-400">{label}</span>}
          <span className="flex items-center gap-1.5">
            {isDeterminate && showPercent && (
              <span className={`font-medium tabular-nums ${v.text}`}>{Math.round(clamped)}%</span>
            )}
            {extra && <span className="text-ink-400">{extra}</span>}
          </span>
        </div>
      )}
      <div className={`relative w-full overflow-hidden ${roundedClass} bg-ink-100 dark:bg-ink-800 ${heightClass}`}>
        {isDeterminate ? (
          <div
            className={`${v.bar} ${roundedClass} ${heightClass} transition-all duration-300 ease-out shadow-sm ${v.glow}`}
            style={{ width: `${clamped}%` }}
          />
        ) : (
          <div
            className={`${v.bar} ${roundedClass} ${heightClass} w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]`}
            style={{
              animation: 'progress-indeterminate 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}