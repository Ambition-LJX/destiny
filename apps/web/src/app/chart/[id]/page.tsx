'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useParams } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { Disclaimer } from '@/components/Disclaimer';
import { ExportButton } from '@/components/ExportButton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { chartApi, ApiError } from '@/lib/api';
import type { ChartResult } from '@/lib/types';
import { PILLAR_POSITION_LABEL } from '@/lib/elements';
import { PillarsTable } from '@/features/chart/PillarsTable';
import { FiveElementsChart } from '@/features/chart/FiveElementsChart';
import { LuckTimeline } from '@/features/chart/LuckTimeline';
import { OverviewPanel } from '@/features/chart/OverviewPanel';
import { ReportPanel } from '@/features/report/ReportPanel';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { useBillingStore } from '@/lib/billingStore';

/**
 * 命盘详情页：四柱、五行、大运时间轴、AI 报告、命盘问答。
 */
export default function ChartPage() {
  const { ready, authed } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const chartId = params.id;

  const [result, setResult] = useState<ChartResult | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'chart' | 'report' | 'chat'>('chart');
  const refreshBilling = useBillingStore((s) => s.refresh);

  // 各 tab 的 ref（用于 html2canvas 截图导出）
  const chartRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // 根据当前 tab 选择正确的 ref
  const getActiveRef = (): RefObject<HTMLDivElement> => {
    switch (tab) {
      case 'report': return reportRef;
      case 'chat': return chatRef;
      default: return chartRef;
    }
  };

  useEffect(() => {
    if (authed) refreshBilling();
  }, [authed, refreshBilling]);

  useEffect(() => {
    if (!authed) return;
    chartApi
      .get(chartId)
      .then(setResult)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : '加载排盘结果失败'),
      );
  }, [authed, chartId]);

  if (!ready || !authed) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <p className="mx-auto max-w-lg px-4 py-20 text-center text-ink-400">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {error && <p className="text-sm text-fire">{error}</p>}

        {!result && !error && (
          <p className="py-20 text-center text-ink-400">排盘结果加载中…</p>
        )}

        {result && (
          <>
            {/* 头部命盘档案卡 */}
            <div className="card !bg-gradient-to-br !from-ink-50/80 !to-wood/5 dark:!from-ink-900 dark:!to-wood/10 border-none relative overflow-hidden !p-6">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-wood/10 blur-3xl dark:bg-wood/20" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-fire/10 blur-3xl dark:bg-fire/20" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="font-serif text-3xl font-bold tracking-wider text-ink-900 dark:text-ink-100">
                    {result.chart.pillars.year.heavenlyStem}
                    {result.chart.pillars.year.earthlyBranch}{' '}
                    {result.chart.pillars.month.heavenlyStem}
                    {result.chart.pillars.month.earthlyBranch}{' '}
                    {result.chart.pillars.day.heavenlyStem}
                    {result.chart.pillars.day.earthlyBranch}{' '}
                    {result.chart.pillars.hour
                      ? `${result.chart.pillars.hour.heavenlyStem}${result.chart.pillars.hour.earthlyBranch}`
                      : '（时辰未知）'}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600 dark:text-ink-400">
                    <span className="flex items-center gap-1 rounded-full bg-earth/10 px-2 py-0.5 text-earth dark:bg-earth/20">
                      🐾 生肖属 {result.chart.zodiac}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-metal/10 px-2 py-0.5 text-metal dark:bg-metal/20">
                      {result.chart.meta.gender === 'male' ? '♂ 男命' : '♀ 女命'}
                    </span>
                    {result.chart.meta.trueSolarTimeApplied && (
                      <span className="flex items-center gap-1 rounded-full bg-water/10 px-2 py-0.5 text-water dark:bg-water/20">
                        ☀️ 真太阳时 {result.chart.meta.trueSolarCorrectionMinutes > 0 ? '+' : ''}
                        {result.chart.meta.trueSolarCorrectionMinutes} 分
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <ExportButton getTarget={() => getActiveRef().current} zodiac={result.chart.zodiac} />
                  <span className="rounded-full border border-ink-200 bg-white/50 px-3 py-1 text-xs text-ink-500 backdrop-blur-sm dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-400">
                    v{result.chart.engineVersion}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-2 rounded-full border border-ink-200 bg-white/50 p-1 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-900/50">
              <Tab active={tab === 'chart'} onClick={() => setTab('chart')} accent="wood">
                命盘详解
              </Tab>
              <Tab active={tab === 'report'} onClick={() => setTab('report')} accent="fire">
                AI 智能解读
              </Tab>
              <Tab active={tab === 'chat'} onClick={() => setTab('chat')} accent="water">
                命盘问答
              </Tab>
            </div>

            {/* 命盘 tab 内容：始终渲染（供 html2canvas 截图），非活跃时隐藏 */}
            <div
              ref={chartRef}
              className="mt-6 space-y-6"
              hidden={tab !== 'chart'}
            >
              {/* 命盘通俗解读 - 大白话翻译 */}
              <OverviewPanel chartId={chartId} />

              <section className="card">
                <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">四柱命盘</h2>
                <PillarsTable chart={result.chart} />
              </section>
              <section className="card">
                <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">五行力量</h2>
                <FiveElementsChart chart={result.chart} />
                {(result.chart.fiveElements.missingElements.length > 0 ||
                  result.chart.dayXunKong.length > 0 ||
                  result.chart.mingGong) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
                    {result.chart.fiveElements.missingElements.length > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-earth/10 px-2 py-1 text-xs text-earth dark:bg-earth/20">
                        <span>💡</span> 缺失：{result.chart.fiveElements.missingElements.join('、')}
                      </span>
                    )}
                    {result.chart.dayXunKong.length > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-metal/10 px-2 py-1 text-xs text-metal dark:bg-metal/20">
                        <span>⚪</span> 旬空：{result.chart.dayXunKong.join('、')}
                      </span>
                    )}
                    {result.chart.mingGong && (
                      <span className="flex items-center gap-1 rounded-md bg-water/10 px-2 py-1 text-xs text-water dark:bg-water/20">
                        <span>🏛️</span> 命宫：{result.chart.mingGong}
                      </span>
                    )}
                  </div>
                )}
              </section>

              {result.chart.patterns.length > 0 && (
                <section className="card">
                  <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">命局格局</h2>
                  <div className="space-y-3">
                    {result.chart.patterns.map((p) => (
                      <div
                        key={p.code}
                        className="rounded-lg border border-earth/25 bg-earth/5 p-3 dark:border-earth/30 dark:bg-earth/10"
                      >
                        <div className="mb-1 font-medium text-ink-900 dark:text-ink-100">{p.name}</div>
                        <p className="text-sm text-ink-600 dark:text-ink-300">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {result.chart.relationships.length > 0 && (
                <section className="card">
                  <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">合冲刑害破</h2>
                  <ul className="space-y-1 text-sm text-ink-700 dark:text-ink-300">
                    {result.chart.relationships.map((r, i) => (
                      <li key={i}>
                        <b className="text-ink-900 dark:text-ink-100">{r.kind}</b>：
                        {r.positions.map((pos, k) => (
                          <span key={k} className="ml-1">
                            {PILLAR_POSITION_LABEL[pos]}[{r.chars[k]}]
                          </span>
                        ))}
                        {r.transformed && (
                          <span className="ml-2 text-fire">→ {r.transformed}</span>
                        )}
                        {r.note && (
                          <span className="ml-2 text-ink-400 dark:text-ink-500">（{r.note}）</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.chart.shenshaDetail.length > 0 && (
                <section className="card">
                  <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">神煞（带出处）</h2>
                  <ul className="grid grid-cols-1 gap-1 text-sm text-ink-700 dark:text-ink-300 md:grid-cols-2">
                    {result.chart.shenshaDetail.map((s, i) => (
                      <li
                        key={i}
                        className="rounded border border-metal/25 bg-metal/5 px-3 py-2 dark:border-metal/30 dark:bg-metal/10"
                      >
                        <b className="text-ink-900 dark:text-ink-100">{s.name}</b>
                        <span className="ml-2 text-xs text-ink-400 dark:text-ink-500">
                          {PILLAR_POSITION_LABEL[s.position]}（{s.source}）
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="card">
                <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">大运流年</h2>
                <LuckTimeline chart={result.chart} />
              </section>

              <div className="mt-4">
                <Disclaimer />
              </div>
            </div>

            {/* AI 解读 tab 内容：始终渲染，供导出截图 */}
            <div ref={reportRef} className="mt-6 space-y-4" hidden={tab !== 'report'}>
              <ReportPanel chartId={chartId} />
            </div>

            {/* 命盘问答 tab 内容：始终渲染，供导出截图 */}
            <div ref={chatRef} className="mt-6" hidden={tab !== 'chat'}>
              <ChatPanel chartId={chartId} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const TAB_ACTIVE_STYLES = {
  wood: 'bg-wood text-white shadow-md shadow-wood/20',
  fire: 'bg-fire text-white shadow-md shadow-fire/20',
  water: 'bg-water text-white shadow-md shadow-water/20',
} as const;

function Tab({
  active,
  onClick,
  children,
  accent = 'wood',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: keyof typeof TAB_ACTIVE_STYLES;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
        active
          ? TAB_ACTIVE_STYLES[accent]
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}
