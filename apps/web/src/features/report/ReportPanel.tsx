'use client';

import { useEffect, useRef, useState } from 'react';
import { reportApi, streamSse } from '@/lib/api';
import { DIMENSIONS } from '@/lib/elements';
import type { ReportDimension, StoredReport } from '@/lib/types';
import { RichText } from './RichText';

interface DimensionState {
  content: string;
  loading: boolean;
  done: boolean;
  error?: string;
  lastGeneratedAt?: string;
  cached?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/**
 * 报告面板：分维度卡片，点击后流式生成并渲染。
 * 支持：单维度流式生成、一键生成、重新生成、历史报告时间轴。
 */
export function ReportPanel({ chartId }: { chartId: string }) {
  const [states, setStates] = useState<Record<string, DimensionState>>({});
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [history, setHistory] = useState<Record<string, StoredReport[]>>({});

  // 使用 ref 追踪流式内容，避免闭包问题
  const contentRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // 加载历史报告时间轴
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
          // 以最新一条为初值，避免用户首次进来看到空白
          const prev = seeded[r.dimension];
          if (!prev || prev.lastGeneratedAt === undefined) {
            seeded[r.dimension] = {
              content: r.content,
              done: true,
              loading: false,
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

  async function generate(dim: ReportDimension) {
    const idempKey = `${chartId}:${dim}:${Date.now()}`;
    contentRef.current[dim] = ''; // 重置 ref
    setStates((s) => ({
      ...s,
      [dim]: { content: '', loading: true, done: false },
    }));

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
              loading: true,
              done: false,
            },
          }));
        },
        onDone: (dc) => {
          if (dc) setDisclaimer(dc);
          const nowIso = new Date().toISOString();
          const finalContent = contentRef.current[dim] ?? '';
          setStates((s) => ({
            ...s,
            [dim]: {
              ...s[dim],
              content: finalContent,
              loading: false,
              done: true,
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
        },
        onError: (message) =>
          setStates((s) => ({
            ...s,
            [dim]: { ...s[dim], loading: false, done: true, error: message },
          })),
      },
    );
  }

  async function generateAll() {
    setStates((s) => {
      const next = { ...s };
      for (const d of DIMENSIONS) {
        next[d.key] = { content: '', loading: true, done: false };
      }
      return next;
    });

    try {
      const { disclaimer: dc, reports, llmMeta } = await reportApi.generateAll(chartId);
      if (dc) setDisclaimer(dc);
      const nowIso = new Date().toISOString();
      setStates((s) => {
        const next = { ...s };
        for (const item of reports) {
          next[item.dimension] = {
            content: item.content,
            loading: false,
            done: true,
            lastGeneratedAt: nowIso,
            cached: item.cached,
          };
        }
        return next;
      });
      if (llmMeta) {
        // eslint-disable-next-line no-console
        console.info(`[LLM] ${llmMeta.provider}/${llmMeta.model} 缓存命中 ${llmMeta.cacheHits}/${llmMeta.total}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败';
      setStates((s) => {
        const next = { ...s };
        for (const d of DIMENSIONS) {
          next[d.key] = { ...s[d.key], loading: false, done: true, error: msg };
        }
        return next;
      });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">AI 命理解读</h2>
        <button className="btn-primary" onClick={generateAll}>
          一键生成全部维度
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DIMENSIONS.map((d) => {
          const st = states[d.key];
          const historyList = history[d.key] ?? [];
          return (
            <div key={d.key} className="card">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium text-ink-900">
                  <span className="text-xl">{d.icon}</span>
                  {d.label}
                </h3>
                <div className="flex items-center gap-2">
                  {st?.lastGeneratedAt && (
                    <span className="text-xs text-ink-400">
                      {st.cached ? '缓存' : '新'} · {formatTime(st.lastGeneratedAt)}
                    </span>
                  )}
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => generate(d.key)}
                    disabled={st?.loading}
                  >
                    {st?.loading ? '生成中…' : st?.done ? '重新生成' : '生成解读'}
                  </button>
                </div>
              </div>

              {st?.error && (
                <p className="mt-3 text-sm text-fire">{st.error}</p>
              )}

              {st?.content && (
                <div className="mt-3">
                  <RichText text={st.content} />
                  {st.loading && (
                    <span className="ml-0.5 animate-pulse text-ink-400">▋</span>
                  )}
                </div>
              )}

              {!st && (
                <p className="mt-3 text-sm text-ink-400">
                  点击右上角按钮，生成该维度的白话解读。
                </p>
              )}

              {historyList.length > 0 && (
                <details className="mt-3 text-xs text-ink-500">
                  <summary className="cursor-pointer text-ink-400">
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
        <p className="mt-6 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
          {disclaimer}
        </p>
      )}
    </div>
  );
}
