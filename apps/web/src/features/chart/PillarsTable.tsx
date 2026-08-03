'use client';

import type { BaziChart, Pillar } from '@/lib/types';
import { ELEMENT_BG, ELEMENT_COLORS, STEM_ELEMENT } from '@/lib/elements';

/**
 * 四柱表：天干、地支、十神、藏干、纳音，按五行配色。
 */
export function PillarsTable({ chart }: { chart: BaziChart }) {
  const cols: { key: string; label: string; pillar: Pillar | null }[] = [
    { key: 'year', label: '年柱', pillar: chart.pillars.year },
    { key: 'month', label: '月柱', pillar: chart.pillars.month },
    { key: 'day', label: '日柱', pillar: chart.pillars.day },
    { key: 'hour', label: '时柱', pillar: chart.pillars.hour },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-center">
        <thead>
          <tr className="text-sm text-ink-500">
            <th className="w-20 py-2 font-medium">&nbsp;</th>
            {cols.map((c) => (
              <th key={c.key} className="py-2 font-medium">
                {c.label}
                {c.key === 'day' && (
                  <span className="ml-1 text-xs text-ink-400">(日主)</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-ink-900">
          <Row label="十神">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  <span className="text-sm text-ink-600">{c.pillar.tenGod}</span>
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>

          <Row label="天干">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  <StemBadge char={c.pillar.heavenlyStem} />
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>

          <Row label="地支">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  <BranchBadge char={c.pillar.earthlyBranch} element={c.pillar.branchElement} />
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>

          <Row label="藏干">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  <div className="flex flex-col gap-0.5 text-xs text-ink-500">
                    {c.pillar.hiddenStems.map((h, i) => (
                      <span key={i}>
                        {h}
                        <span className="ml-1 text-ink-400">
                          {c.pillar!.hiddenStemTenGods[i]}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>

          <Row label="纳音">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  <span className="text-xs text-ink-500">{c.pillar.naYin}</span>
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>

          <Row label="十二长生">
            {cols.map((c) => (
              <Cell key={c.key}>
                {c.pillar ? (
                  c.pillar.twelveStage ? (
                    <span className="text-xs text-fire">{c.pillar.twelveStage}</span>
                  ) : (
                    <span className="text-xs text-ink-300">—（日柱）</span>
                  )
                ) : (
                  <Unknown />
                )}
              </Cell>
            ))}
          </Row>
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-ink-100">
      <td className="py-3 text-sm font-medium text-ink-400">{label}</td>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="py-3 align-middle">{children}</td>;
}

function StemBadge({ char }: { char: string }) {
  const el = STEM_ELEMENT[char];
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl font-serif"
      style={{ color: ELEMENT_COLORS[el], background: ELEMENT_BG[el] }}
    >
      {char}
    </span>
  );
}

function BranchBadge({ char, element }: { char: string; element: keyof typeof ELEMENT_COLORS }) {
  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl font-serif"
      style={{ color: ELEMENT_COLORS[element], background: ELEMENT_BG[element] }}
    >
      {char}
    </span>
  );
}

function Unknown() {
  return <span className="text-xs text-ink-300">未知</span>;
}
