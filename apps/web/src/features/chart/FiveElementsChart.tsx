'use client';

import dynamic from 'next/dynamic';
import type { BaziChart } from '@/lib/types';
import { ALL_ELEMENTS, ELEMENT_COLORS, STRENGTH_LABEL } from '@/lib/elements';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/**
 * 五行力量雷达图 + 旺衰 / 喜忌摘要。
 */
export function FiveElementsChart({ chart }: { chart: BaziChart }) {
  const fe = chart.fiveElements;
  const values = ALL_ELEMENTS.map((el) => fe.scores[el]);
  const max = Math.max(4, ...values);

  const option = {
    tooltip: {},
    radar: {
      indicator: ALL_ELEMENTS.map((el) => ({ name: el, max })),
      radius: '65%',
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      splitArea: { areaStyle: { color: ['#fafafa', '#fff'] } },
      axisName: {
        color: '#434c5e',
        fontSize: 14,
        fontWeight: 600,
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '五行力量',
            areaStyle: { color: 'rgba(59, 130, 246, 0.18)' },
            lineStyle: { color: '#3b82f6' },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} style={{ height: 280 }} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ALL_ELEMENTS.map((el) => (
          <span
            key={el}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
            style={{ background: `${ELEMENT_COLORS[el]}1a`, color: ELEMENT_COLORS[el] }}
          >
            <b>{el}</b> {fe.scores[el]}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="日主" value={`${chart.pillars.day.heavenlyStem}（${fe.dayMasterElement}）`} />
        <Stat label="旺衰" value={`${STRENGTH_LABEL[fe.dayMasterStrength]} ${fe.dayMasterScore}分`} />
        <Stat label="喜用神" value={fe.favorable.join('、')} accent="#3fa34d" />
        <Stat label="忌神" value={fe.unfavorable.join('、')} accent="#e5484d" />
      </dl>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
      <div className="text-xs text-ink-400">{label}</div>
      <div className="mt-0.5 font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
