'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { streamSse } from '@/lib/api';
import { RichText } from '../report/RichText';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingDots } from '@/components/LoadingDots';

interface OverviewPanelProps {
  chartId: string;
}

/**
 * 命盘通俗解读面板：
 * 在命盘页面最顶部展示，用大白话把命盘核心特点翻译出来，
 * 让完全不懂命理术语的用户也能一眼看懂自己的命盘。
 */
export function OverviewPanel({ chartId }: OverviewPanelProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);

  const contentRef = useRef('');
  const startTimeRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计时器
  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 200);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading]);

  const formatElapsed = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m${sec}s`;
  };

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const generate = useCallback(() => {
    if (loading) return;

    const idempKey = `${chartId}:overview:${Date.now()}`;
    contentRef.current = '';
    startTimeRef.current = Date.now();
    abortRef.current = new AbortController();

    setContent('');
    setError('');
    setDisclaimer('');
    setCharCount(0);
    setElapsed(0);
    setLoading(true);
    setHasGenerated(true);

    streamSse(
      `/reports/overview?chartId=${encodeURIComponent(chartId)}`,
      {
        method: 'GET',
        headers: {
          'idempotency-key': idempKey,
        },
      },
      {
        onDelta: (text) => {
          contentRef.current += text;
          setContent(contentRef.current);
          setCharCount(contentRef.current.length);
        },
        onDone: (dc) => {
          if (dc) setDisclaimer(dc);
          setLoading(false);
        },
        onError: (msg) => {
          setError(msg);
          setLoading(false);
        },
      },
      abortRef.current.signal,
    ).catch(() => {
      // Abort 错误静默处理
      setLoading(false);
    });
  }, [chartId, loading]);

  return (
    <section
      className="card relative overflow-hidden"
      style={{ '--card-accent': 'linear-gradient(to right, #3fa34d, #e5484d, #c8952f, #d4af37, #3b82f6)' } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-ink-100">
            <span className="text-xl">💡</span>
            命盘通俗解读
          </h2>
          <p className="mt-1 text-xs text-ink-400">
            不懂命理术语？这里用大白话给你讲明白这张命盘是什么意思
          </p>
        </div>
        {!loading && !hasGenerated && (
          <button className="btn-primary" onClick={generate}>
            开始解读
          </button>
        )}
        {loading && (
          <button
            className="btn-ghost text-xs border-fire/40 text-fire hover:border-fire hover:bg-fire/5"
            onClick={stopGeneration}
          >
            停止
          </button>
        )}
        {!loading && hasGenerated && !error && (
          <button className="btn-ghost text-xs" onClick={generate}>
            重新解读
          </button>
        )}
      </div>

      {/* 进度条 */}
      {loading && (
        <div className="mb-4">
          <ProgressBar
            variant="wood"
            size="md"
            label={
              <LoadingDots text="AI 正在翻译你的命盘" dotClassName="bg-wood" />
            }
            extra={
              <span className="tabular-nums">
                {charCount} 字 · {formatElapsed(elapsed)}
              </span>
            }
          />
        </div>
      )}

      {/* 初始状态提示 */}
      {!hasGenerated && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-5xl">🔮</div>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            点击「开始解读」，AI 会把你的命盘翻译成通俗易懂的话
          </p>
          <p className="mt-1 text-xs text-ink-400">
            包括：日主是什么意思、五行强弱怎么看、关键信号解释、实用建议
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-fire/25 bg-fire/5 px-4 py-3">
          <p className="text-sm text-fire">{error}</p>
          <button
            className="mt-2 text-xs text-fire/80 hover:text-fire underline"
            onClick={generate}
          >
            重试
          </button>
        </div>
      )}

      {/* 解读内容 */}
      {content && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <RichText text={content} />
          {loading && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink-400 align-middle" />
          )}
        </div>
      )}

      {/* 完成后的统计 */}
      {!loading && content && (
        <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-3 text-xs text-ink-400 dark:border-ink-800">
          <span className="flex items-center gap-1 text-wood">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            解读完成
          </span>
          <span>{charCount} 字</span>
          {elapsed > 0 && <span>耗时 {formatElapsed(elapsed)}</span>}
        </div>
      )}

      {/* 免责声明 */}
      {disclaimer && !loading && (
        <p className="mt-4 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-500 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-400">
          {disclaimer}
        </p>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}