'use client';

import type { BaziChart } from '@/lib/types';
import { ELEMENT_COLORS } from '@/lib/elements';

/**
 * 大运时间轴 + 当前流年。
 */
export function LuckTimeline({ chart }: { chart: BaziChart }) {
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-800">大运走势</h3>
        <span className="text-xs text-ink-400">{chart.luckStart.description}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {chart.luckCycles.map((cycle) => {
          const active =
            currentYear >= cycle.startYear && currentYear <= cycle.endYear;
          const color = ELEMENT_COLORS[cycle.element];
          return (
            <div
              key={cycle.index}
              className={`min-w-[92px] flex-1 rounded-xl border px-3 py-3 text-center transition ${
                active
                  ? 'border-ink-900 bg-ink-900 text-white shadow-card'
                  : 'border-ink-100 bg-white'
              }`}
            >
              <div className={`text-xs ${active ? 'text-ink-200' : 'text-ink-400'}`}>
                {cycle.startAge}岁 · {cycle.startYear}
              </div>
              <div className="mt-1 text-lg font-bold tracking-wide">
                <span style={active ? undefined : { color }}>{cycle.heavenlyStem}</span>
                <span>{cycle.earthlyBranch}</span>
              </div>
              <div className={`mt-1 text-xs ${active ? 'text-ink-200' : 'text-ink-500'}`}>
                {cycle.tenGod}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <span className="font-medium text-amber-800">
          当前流年 {chart.currentYear.year}：
        </span>
        <span className="text-amber-700">
          {chart.currentYear.heavenlyStem}
          {chart.currentYear.earthlyBranch}（{chart.currentYear.tenGod}，
          {chart.currentYear.element}），虚岁 {chart.currentYear.age}
        </span>
      </div>
    </div>
  );
}
