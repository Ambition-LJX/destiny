'use client';

import { useEffect, useRef, useState } from 'react';
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

  // 命盘区域的 ref（用于 html2canvas 截图导出）
  const chartRef = useRef<HTMLDivElement>(null);

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
      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && <p className="text-sm text-fire">{error}</p>}

        {!result && !error && (
          <p className="py-20 text-center text-ink-400">排盘结果加载中…</p>
        )}

        {result && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <ChartHeader chart={result.chart} />
              <div className="flex items-center gap-2">
                <ExportButton targetRef={chartRef} zodiac={result.chart.zodiac} />
                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                  引擎版本 v{result.chart.engineVersion}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-2 border-b border-ink-100 dark:border-ink-800">
              <Tab active={tab === 'chart'} onClick={() => setTab('chart')} accent="wood">
                命盘
              </Tab>
              <Tab active={tab === 'report'} onClick={() => setTab('report')} accent="fire">
                AI 解读
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
                {result.chart.fiveElements.missingElements.length > 0 && (
                  <p className="mt-3 rounded-lg border border-wood/40 bg-wood/5 px-3 py-2 text-xs text-ink-600 dark:border-wood/30 dark:bg-wood/10 dark:text-ink-300">
                    💡 命局五行缺失：
                    <b className="ml-1 text-ink-900 dark:text-ink-100">
                      {result.chart.fiveElements.missingElements.join('、')}
                    </b>
                    ，对应领域可能偏弱，可通过方位/颜色/职业调候补救。
                  </p>
                )}
                {result.chart.dayXunKong.length > 0 && (
                  <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                    日柱旬空（空亡）：
                    <b className="ml-1 text-ink-700 dark:text-ink-300">
                      {result.chart.dayXunKong.join('、')}
                    </b>
                  </p>
                )}
                {result.chart.mingGong && (
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                    命宫：<b className="ml-1 text-ink-700 dark:text-ink-300">{result.chart.mingGong}</b>
                  </p>
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

            {/* 其他 tab 内容 */}
            {tab === 'report' && <ReportPanel chartId={chartId} />}
            {tab === 'chat' && <ChatPanel chartId={chartId} />}
          </>
        )}
      </main>
    </div>
  );
}

function ChartHeader({ chart }: { chart: ChartResult['chart'] }) {
  const p = chart.pillars;
  const bazi = [
    `${p.year.heavenlyStem}${p.year.earthlyBranch}`,
    `${p.month.heavenlyStem}${p.month.earthlyBranch}`,
    `${p.day.heavenlyStem}${p.day.earthlyBranch}`,
    p.hour ? `${p.hour.heavenlyStem}${p.hour.earthlyBranch}` : '时辰未知',
  ].join(' ');

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">{bazi}</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        生肖属{chart.zodiac} · {chart.meta.gender === 'male' ? '男命' : '女命'} ·
        {chart.meta.trueSolarTimeApplied
          ? ` 真太阳时校正 ${chart.meta.trueSolarCorrectionMinutes} 分`
          : ' 未启用真太阳时'}
      </p>
    </div>
  );
}

const TAB_ACTIVE_STYLES = {
  wood: 'border-wood text-wood',
  fire: 'border-fire text-fire',
  water: 'border-water text-water',
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
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? TAB_ACTIVE_STYLES[accent]
          : 'border-transparent text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300'
      }`}
    >
      {children}
    </button>
  );
}
