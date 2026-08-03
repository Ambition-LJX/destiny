'use client';

interface LoadingDotsProps {
  text?: string;
  className?: string;
  dotClassName?: string;
  interval?: number;
}

export function LoadingDots({
  text,
  className = '',
  dotClassName = 'bg-ink-400',
  interval = 400,
}: LoadingDotsProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {text && <span>{text}</span>}
      <span className="inline-flex gap-0.5">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClassName}`}
          style={{ animation: `pulse-bounce ${interval * 3}ms ease-in-out infinite` }}
        />
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClassName}`}
          style={{ animation: `pulse-bounce ${interval * 3}ms ease-in-out ${interval}ms infinite` }}
        />
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClassName}`}
          style={{ animation: `pulse-bounce ${interval * 3}ms ease-in-out ${interval * 2}ms infinite` }}
        />
      </span>
      <style>{`
        @keyframes pulse-bounce {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </span>
  );
}