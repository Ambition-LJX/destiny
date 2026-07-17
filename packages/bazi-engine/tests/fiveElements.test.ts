import { describe, it, expect } from 'vitest';
import { computeFiveElements } from '../src/core/fiveElements.js';
import { buildPillar } from '../src/core/pillars.js';
import type { HeavenlyStem } from '../src/constants/ganzhi.js';

function makePillars(
  dayMaster: HeavenlyStem,
  data: [string, string][],
) {
  const [y, m, d, h] = data;
  return {
    year: buildPillar(dayMaster, y[0], y[1]),
    month: buildPillar(dayMaster, m[0], m[1]),
    day: buildPillar(dayMaster, d[0], d[1], true),
    hour: h ? buildPillar(dayMaster, h[0], h[1]) : null,
  };
}

describe('五行统计与旺衰', () => {
  it('全部五行计数总和合理', () => {
    const pillars = makePillars('庚', [
      ['庚', '午'],
      ['辛', '巳'],
      ['庚', '辰'],
      ['辛', '巳'],
    ]);
    const fe = computeFiveElements(pillars);
    const total = Object.values(fe.counts).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(fe.dayMasterElement).toBe('金');
  });

  it('金多身强，喜用为克泄耗（火水木）', () => {
    const pillars = makePillars('庚', [
      ['庚', '午'],
      ['辛', '巳'],
      ['庚', '辰'],
      ['辛', '巳'],
    ]);
    const fe = computeFiveElements(pillars);
    expect(fe.dayMasterStrength).toBe('strong');
    expect(fe.favorable).toContain('火');
    expect(fe.unfavorable).toContain('金');
  });

  it('旺衰得分在 0-100 之间', () => {
    const pillars = makePillars('甲', [
      ['甲', '子'],
      ['丙', '寅'],
      ['甲', '辰'],
      ['戊', '午'],
    ]);
    const fe = computeFiveElements(pillars);
    expect(fe.dayMasterScore).toBeGreaterThanOrEqual(0);
    expect(fe.dayMasterScore).toBeLessThanOrEqual(100);
  });

  it('喜用神与忌神不重叠', () => {
    const pillars = makePillars('壬', [
      ['壬', '子'],
      ['癸', '亥'],
      ['壬', '申'],
      ['庚', '子'],
    ]);
    const fe = computeFiveElements(pillars);
    for (const f of fe.favorable) {
      expect(fe.unfavorable).not.toContain(f);
    }
  });
});
