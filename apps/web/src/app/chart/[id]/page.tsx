'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { Disclaimer } from '@/components/Disclaimer';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { chartApi, ApiError } from '@/lib/api';
import type { ChartResult } from '@/lib/types';
import { PillarsTable } from '@/features/chart/PillarsTable';
import { FiveElementsChart } from '@/features/chart/FiveElementsChart';
import { LuckTimeline } from '@/features/chart/LuckTimeline';
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
            <ChartHeader chart={result.chart} />

            <div className="mt-6 flex gap-2 border-b border-ink-100">
              <Tab active={tab === 'chart'} onClick={() => setTab('chart')}>
                命盘
              </Tab>
              <Tab active={tab === 'report'} onClick={() => setTab('report')}>
                AI 解读
              </Tab>
              <Tab active={tab === 'chat'} onClick={() => setTab('chat')}>
                命盘问答
              </Tab>
            </div>

            <div className="mt-6">
              {tab === 'chart' && (
                <div className="space-y-6">
                  <section className="card">
                    <h2 className="mb-4 text-lg font-semibold text-ink-900">四柱命盘</h2>
                    <PillarsTable chart={result.chart} />
                  </section>
                  <section className="card">
                    <h2 className="mb-4 text-lg font-semibold text-ink-900">五行力量</h2>
                    <FiveElementsChart chart={result.chart} />
                  </section>
                  <section className="card">
                    <h2 className="mb-4 text-lg font-semibold text-ink-900">大运流年</h2>
                    <LuckTimeline chart={result.chart} />
                  </section>
                </div>
              )}
              {tab === 'report' && <ReportPanel chartId={chartId} />}
              {tab === 'chat' && <ChatPanel chartId={chartId} />}
            </div>

            <div className="mt-8">
              <Disclaimer />
            </div>
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink-900">
          {bazi}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          生肖属{chart.zodiac} · {chart.meta.gender === 'male' ? '男命' : '女命'} ·
          {chart.meta.trueSolarTimeApplied
            ? ` 真太阳时校正 ${chart.meta.trueSolarCorrectionMinutes} 分`
            : ' 未启用真太阳时'}
        </p>
      </div>
      <span className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500">
        引擎版本 v{chart.engineVersion}
      </span>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-ink-900 text-ink-900'
          : 'border-transparent text-ink-400 hover:text-ink-600'
      }`}
    >
      {children}
    </button>
  );
}
