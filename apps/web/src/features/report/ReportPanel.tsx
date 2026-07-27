'use client';

import { useState } from 'react';
import { reportApi, streamSse } from '@/lib/api';
import { DIMENSIONS } from '@/lib/elements';
import type { ReportDimension } from '@/lib/types';
import { RichText } from './RichText';

interface DimensionState {
  content: string;
  loading: boolean;
  done: boolean;
  error?: string;
}

/**
 * 报告面板：分维度卡片，点击后流式生成并渲染。
 */
export function ReportPanel({ chartId }: { chartId: string }) {
  const [states, setStates] = useState<Record<string, DimensionState>>({});
  const [disclaimer, setDisclaimer] = useState<string>('');

  async function generate(dim: ReportDimension) {
    setStates((s) => ({
      ...s,
      [dim]: { content: '', loading: true, done: false },
    }));

    await streamSse(
      `/reports/stream?chartId=${encodeURIComponent(chartId)}&dimension=${dim}`,
      { method: 'GET' },
      {
        onDelta: (text) =>
          setStates((s) => ({
            ...s,
            [dim]: {
              ...s[dim],
              content: (s[dim]?.content ?? '') + text,
              loading: true,
              done: false,
            },
          })),
        onDone: (dc) => {
          if (dc) setDisclaimer(dc);
          setStates((s) => ({
            ...s,
            [dim]: { ...s[dim], loading: false, done: true },
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
      const { disclaimer: dc, reports } = await reportApi.generateAll(chartId);
      if (dc) setDisclaimer(dc);
      setStates((s) => {
        const next = { ...s };
        for (const item of reports) {
          next[item.dimension] = {
            content: item.content,
            loading: false,
            done: true,
          };
        }
        return next;
      });
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
          return (
            <div key={d.key} className="card">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium text-ink-900">
                  <span className="text-xl">{d.icon}</span>
                  {d.label}
                </h3>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => generate(d.key)}
                  disabled={st?.loading}
                >
                  {st?.loading ? '生成中…' : st?.done ? '重新生成' : '生成解读'}
                </button>
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
