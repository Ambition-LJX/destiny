'use client';

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { reportApi, streamSse } from '@/lib/api';
import { DIMENSION_ELEMENT, DIMENSIONS, ELEMENT_BG, ELEMENT_COLORS } from '@/lib/elements';
import type { ReportDimension, StoredReport } from '@/lib/types';
import { RichText } from './RichText';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingDots } from '@/components/LoadingDots';

interface DimensionState {
  content: string;
  loading: boolean;
  done: boolean;
  error?: string;
  lastGeneratedAt?: string;
  cached?: boolean;
  charCount?: number;
  elapsed?: number;
}

const MAX_CONCURRENT = 3;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m${sec}s`;
}

/**
 * 报告面板：分维度卡片，点击后流式生成并渲染。
 * 支持：单维度流式生成（带进度条/字符数/耗时）、一键生成（并发流式，限制并发数）、重新生成、历史报告时间轴。
 */
export function ReportPanel({ chartId }: { chartId: string }) {
  const [states, setStates] = useState<Record<string, DimensionState>>({});
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [history, setHistory] = useState<Record<string, StoredReport[]>>({});
  const [globalProgress, setGlobalProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    isGenerating: boolean;
    currentDim?: string;
  }>({ total: 0, completed: 0, failed: 0, isGenerating: false });

  // Refs 用于追踪流式数据（避免闭包问题）
  const contentRef = useRef<Record<string, string>>({});
  const startTimeRef = useRef<Record<string, number>>({});
  const abortRef = useRef<Record<string, AbortController>>({});

  // 加载定时器：更新耗时
  useEffect(() => {
    const interval = setInterval(() => {
      setStates((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          const st = next[key];
          const startTs = startTimeRef.current[key];
          if (st.loading && startTs) {
            next[key] = { ...st, elapsed: Date.now() - startTs };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reportApi
      .list(chartId)
      .then((list) => {
        if (cancelled) return;
        const grouped: Record<string, StoredReport[]> = {};
        const seeded: Record<string, DimensionState> = {};
        for (const r of list) {
          if (!grouped[r.dimension]) grouped[r.dimension] = [];
          grouped[r.dimension].push(r);
          const prev = seeded[r.dimension];
          if (!prev || prev.lastGeneratedAt === undefined) {
            seeded[r.dimension] = {
              content: r.content,
              done: true,
              loading: false,
              charCount: r.content.length,
              lastGeneratedAt: r.createdAt,
              cached: true,
            };
          }
        }
        setHistory(grouped);
        setStates((s) => ({ ...seeded, ...s }));
      })
      .catch(() => {
        /* 静默失败：可能是未登录等 */
      });
    return () => {
      cancelled = true;
    };
  }, [chartId]);

  const updateGlobalProgress = useCallback(
    (action: 'start' | 'complete' | 'fail' | 'reset', dim?: string, total?: number) => {
      setGlobalProgress((prev) => {
        if (action === 'start') {
          return {
            total: total ?? DIMENSIONS.length,
            completed: prev.completed,
            failed: prev.failed,
            isGenerating: true,
            currentDim: dim,
          };
        }
        if (action === 'complete') {
          const newCompleted = prev.completed + 1;
          return {
            ...prev,
            completed: newCompleted,
            currentDim: undefined,
            isGenerating: newCompleted + prev.failed < (prev.total || 0),
          };
        }
        if (action === 'fail') {
          const newFailed = prev.failed + 1;
          return {
            ...prev,
            failed: newFailed,
            currentDim: undefined,
            isGenerating: prev.completed + newFailed < (prev.total || 0),
          };
        }
        if (action === 'reset') {
          return { total: 0, completed: 0, failed: 0, isGenerating: false };
        }
        return prev;
      });
    },
    [],
  );

  const generateDimension = useCallback(
    async (dim: ReportDimension, onComplete?: () => void) => {
      const idempKey = `${chartId}:${dim}:${Date.now()}`;
      const startTime = Date.now();

      contentRef.current[dim] = '';
      startTimeRef.current[dim] = startTime;
      abortRef.current[dim] = new AbortController();

      setStates((s) => ({
        ...s,
        [dim]: {
          content: '',
          loading: true,
          done: false,
          charCount: 0,
          elapsed: 0,
        },
      }));

      try {
        await streamSse(
          `/reports/stream?chartId=${encodeURIComponent(chartId)}&dimension=${dim}`,
          {
            method: 'GET',
            headers: {
              'idempotency-key': idempKey,
            },
          },
          {
            onDelta: (text) => {
              contentRef.current[dim] = (contentRef.current[dim] ?? '') + text;
              setStates((s) => ({
                ...s,
                [dim]: {
                  ...s[dim],
                  content: contentRef.current[dim] ?? '',
                  charCount: contentRef.current[dim]?.length ?? 0,
                  loading: true,
                  done: false,
                },
              }));
            },
            onDone: (dc) => {
              if (dc) setDisclaimer(dc);
              const nowIso = new Date().toISOString();
              const finalContent = contentRef.current[dim] ?? '';
              const elapsed = Date.now() - startTime;
              setStates((s) => ({
                ...s,
                [dim]: {
                  ...s[dim],
                  content: finalContent,
                  loading: false,
                  done: true,
                  charCount: finalContent.length,
                  elapsed,
                  lastGeneratedAt: nowIso,
                  cached: false,
                },
              }));
              setHistory((h) => ({
                ...h,
                [dim]: [
                  {
                    id: `${dim}-${nowIso}`,
                    dimension: dim,
                    content: finalContent,
                    modelVersion: '',
                    createdAt: nowIso,
                  },
                  ...(h[dim] ?? []),
                ],
              }));
              updateGlobalProgress('complete', dim);
              onComplete?.();
            },
            onError: (message) => {
              setStates((s) => ({
                ...s,
                [dim]: { ...s[dim], loading: false, done: true, error: message },
              }));
              updateGlobalProgress('fail', dim);
              onComplete?.();
            },
          },
          abortRef.current[dim]?.signal,
        );
      } catch {
        setStates((s) => ({
          ...s,
          [dim]: {
            ...s[dim],
            loading: false,
            done: true,
            error: '请求被中断',
          },
        }));
        updateGlobalProgress('fail', dim);
        onComplete?.();
      }
    },
    [chartId, updateGlobalProgress],
  );

  const generate = useCallback(
    async (dim: ReportDimension) => {
      await generateDimension(dim);
    },
    [generateDimension],
  );

  const cancelDimension = useCallback((dim: ReportDimension) => {
    abortRef.current[dim]?.abort();
    setStates((s) => ({
      ...s,
      [dim]: {
        ...s[dim],
        loading: false,
        done: true,
        error: '已取消生成',
      },
    }));
  }, []);

  /**
   * 并发控制：按批次执行任务，每批最多 MAX_CONCURRENT 个
   */
  const runInBatches = useCallback(
    async (items: ReportDimension[], execute: (item: ReportDimension) => Promise<void>): Promise<void> => {
      for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
        const batch = items.slice(i, i + MAX_CONCURRENT);
        await Promise.all(batch.map((item) => execute(item)));
      }
    },
    [],
  );

  const generateAll = useCallback(async () => {
    updateGlobalProgress('reset');

    // 初始化全局进度
    setGlobalProgress({
      total: DIMENSIONS.length,
      completed: 0,
      failed: 0,
      isGenerating: true,
      currentDim: DIMENSIONS[0]?.key,
    });

    // 重置所有维度状态
    setStates((s) => {
      const next = { ...s };
      for (const d of DIMENSIONS) {
        next[d.key] = {
          content: '',
          loading: true,
          done: false,
          charCount: 0,
          elapsed: 0,
        };
      }
      return next;
    });

    // 并发控制：按批次生成
    const dimKeys = DIMENSIONS.map((d) => d.key);
    await runInBatches(dimKeys, (key) => generateDimension(key));

    setTimeout(() => {
      setGlobalProgress((prev) => ({ ...prev, isGenerating: false, currentDim: undefined }));
    }, 300);
  }, [generateDimension, runInBatches, updateGlobalProgress]);

  const cancelAll = useCallback(() => {
    for (const d of DIMENSIONS) {
      if (states[d.key]?.loading) {
        abortRef.current[d.key]?.abort();
      }
    }
    setStates((s) => {
      const next = { ...s };
      for (const d of DIMENSIONS) {
        if (next[d.key]?.loading) {
          next[d.key] = { ...next[d.key], loading: false, done: true, error: '已取消生成' };
        }
      }
      return next;
    });
    setGlobalProgress((prev) => ({ ...prev, isGenerating: false, currentDim: undefined }));
  }, [states]);

  const completedCount = globalProgress.completed + globalProgress.failed;
  const overallProgress = globalProgress.total > 0 ? (completedCount / globalProgress.total) * 100 : 0;
  const hasAnyLoading = Object.values(states).some((s) => s.loading);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">AI 命理解读</h2>
        <div className="flex items-center gap-2">
          {hasAnyLoading && (
            <button
              className="btn-ghost text-xs border-fire/40 text-fire hover:border-fire hover:bg-fire/5"
              onClick={cancelAll}
            >
              取消全部
            </button>
          )}
          <button
            className="btn-primary"
            onClick={generateAll}
            disabled={globalProgress.isGenerating}
          >
            {globalProgress.isGenerating ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                生成中 ({completedCount}/{DIMENSIONS.length})
              </span>
            ) : (
              '一键生成全部维度'
            )}
          </button>
        </div>
      </div>

      {/* 全局进度条 */}
      {globalProgress.isGenerating && (
        <div className="mb-4 rounded-xl border border-ink-100 bg-white/80 p-3 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-900/60">
          <ProgressBar
            value={overallProgress}
            variant="wood"
            size="md"
            showPercent
            label={
              globalProgress.currentDim ? (
                <span className="flex items-center gap-1.5">
                  <span>正在生成：</span>
                  <LoadingDots
                    text={DIMENSIONS.find((d) => d.key === globalProgress.currentDim)?.label}
                    dotClassName="bg-wood"
                  />
                </span>
              ) : (
                <span>总体进度</span>
              )
            }
            extra={`${completedCount} / ${DIMENSIONS.length} 维度`}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {DIMENSIONS.map((d) => {
          const st = states[d.key];
          const historyList = history[d.key] ?? [];
          const element = DIMENSION_ELEMENT[d.key];
          const accentColor = ELEMENT_COLORS[element];
          const accentBg = ELEMENT_BG[element];
          const variantMap: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
            木: 'wood',
            火: 'fire',
            土: 'earth',
            金: 'metal',
            水: 'water',
          };
          const progressVariant: 'wood' | 'fire' | 'earth' | 'metal' | 'water' = variantMap[element] ?? 'wood';

          return (
            <div
              key={d.key}
              className="card transition-all duration-300"
              style={{ '--card-accent': accentColor } as CSSProperties}
            >
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium text-ink-900 dark:text-ink-100">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                    style={{ backgroundColor: accentBg }}
                  >
                    {d.icon}
                  </span>
                  {d.label}
                </h3>
                <div className="flex items-center gap-2">
                  {st?.lastGeneratedAt && !st.loading && (
                    <span className="text-xs text-ink-400">
                      {st.cached ? '缓存' : '新'} · {formatTime(st.lastGeneratedAt)}
                    </span>
                  )}
                  {st?.loading ? (
                    <button
                      className="btn-ghost text-xs border-fire/40 text-fire hover:border-fire hover:bg-fire/5"
                      onClick={() => cancelDimension(d.key)}
                    >
                      取消
                    </button>
                  ) : (
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => generate(d.key)}
                    >
                      {st?.done && st.content ? '重新生成' : '生成解读'}
                    </button>
                  )}
                </div>
              </div>

              {/* 生成中的进度条 */}
              {st?.loading && (
                <div className="mt-3">
                  <ProgressBar
                    variant={progressVariant}
                    size="sm"
                    label={
                      <LoadingDots
                        text="AI 正在解读"
                        dotClassName={
                          progressVariant === 'wood' ? 'bg-wood' :
                          progressVariant === 'fire' ? 'bg-fire' :
                          progressVariant === 'earth' ? 'bg-earth' :
                          progressVariant === 'metal' ? 'bg-metal' : 'bg-water'
                        }
                      />
                    }
                    extra={<>
                      {st.charCount ?? 0} 字
                      {st.elapsed ? ` · ${formatElapsed(st.elapsed)}` : ''}
                    </>}
                  />
                </div>
              )}

              {/* 完成后的统计信息 */}
              {st?.done && st.content && !st.loading && (
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-400">
                  <span>{st.charCount ?? 0} 字</span>
                  {st.elapsed ? <span>耗时 {formatElapsed(st.elapsed)}</span> : null}
                  <span className="flex items-center gap-1 text-wood">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    已完成
                  </span>
                </div>
              )}

              {st?.error && (
                <div className="mt-3 rounded-lg border border-fire/25 bg-fire/5 px-3 py-2">
                  <p className="text-sm text-fire">{st.error}</p>
                  {st.error !== '已取消生成' && st.error !== '请求被中断' && (
                    <button
                      className="mt-2 text-xs text-fire/80 hover:text-fire underline"
                      onClick={() => generate(d.key)}
                    >
                      重试
                    </button>
                  )}
                </div>
              )}

              {st?.content && !st.loading && (
                <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
                  <RichText text={st.content} />
                </div>
              )}

              {!st && (
                <p className="mt-3 text-sm text-ink-400">
                  点击右上角按钮，生成该维度的白话解读。
                </p>
              )}

              {historyList.length > 0 && (
                <details className="mt-4 text-xs text-ink-500">
                  <summary className="cursor-pointer text-ink-400 hover:text-ink-600">
                    历史报告（{historyList.length}）
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {historyList.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span className="truncate">{formatTime(r.createdAt)}</span>
                        <span className="text-ink-400">
                          {r.modelVersion || '本地'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {disclaimer && (
        <p className="mt-6 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-400">
          {disclaimer}
        </p>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}