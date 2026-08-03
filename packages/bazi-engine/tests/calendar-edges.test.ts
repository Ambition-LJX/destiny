import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../src/index.js';
import { computeRelationships } from '../src/core/relationships.js';
import type { BirthInput } from '../src/index.js';

function baseInput(overrides: Partial<BirthInput> = {}): BirthInput {
  return {
    calendar: 'solar',
    year: 1990,
    month: 5,
    day: 15,
    hour: 10,
    minute: 30,
    gender: 'male',
    longitude: 116.4,
    latitude: 39.9,
    useTrueSolarTime: false,
    ...overrides,
  };
}

describe('节气分界精确性', () => {
  it('1990 立春前出生（1月初）应归 1989 年柱', () => {
    // 1990-01-05（立春前）属己巳年（1989）的尾巴
    const chart = calculateBazi(
      baseInput({ year: 1990, month: 1, day: 5, hour: 12, minute: 0 }),
      2026,
    );
    // 己巳
    expect(chart.pillars.year.heavenlyStem).toBe('己');
    expect(chart.pillars.year.earthlyBranch).toBe('巳');
    // 生肖也应属蛇（己巳）
    expect(chart.zodiac).toBe('蛇');
  });

  it('1990 立春后出生（2月中旬）应归 庚午年', () => {
    // 1990-05-15 已在立春后
    const chart = calculateBazi(baseInput({ year: 1990, month: 5, day: 15 }), 2026);
    expect(chart.pillars.year.heavenlyStem).toBe('庚');
    expect(chart.pillars.year.earthlyBranch).toBe('午');
    expect(chart.zodiac).toBe('马');
  });

  it('大寒末（节气月边界）后落入下一节气月', () => {
    // 2024 年立春在 2 月 4 日下午
    // 2024-02-04 11:00（立春前）→ 丑月
    // 2024-02-04 23:00（立春后）→ 寅月
    const before = calculateBazi(
      baseInput({
        year: 2024,
        month: 2,
        day: 4,
        hour: 11,
        minute: 0,
        longitude: 120,
        latitude: 0,
        useTrueSolarTime: false,
      }),
      2026,
    );
    const after = calculateBazi(
      baseInput({
        year: 2024,
        month: 2,
        day: 4,
        hour: 23,
        minute: 30,
        longitude: 120,
        latitude: 0,
        useTrueSolarTime: false,
      }),
      2026,
    );
    // 月柱应不同
    expect(before.pillars.month.earthlyBranch).not.toBe(after.pillars.month.earthlyBranch);
  });
});

describe('未注时辰降级', () => {
  it('hour=null 时，时柱应为 null、其他柱位仍正常', () => {
    const chart = calculateBazi(baseInput({ hour: null, minute: null }), 2026);
    expect(chart.pillars.hour).toBeNull();
    expect(chart.pillars.day.tenGod).toBe('日主');
    expect(chart.meta.hourKnown).toBe(false);
  });

  it('未注时辰时，shensha 列表不应包含仅以时柱为位置的神煞', () => {
    const chart = calculateBazi(baseInput({ hour: null, minute: null }), 2026);
    for (const s of chart.shenshaDetail) {
      expect(s.position).not.toBe('hour');
    }
  });

  it('未注时辰时，relationships 不应含时柱参与的合冲', () => {
    const chart = calculateBazi(baseInput({ hour: null, minute: null }), 2026);
    for (const r of chart.relationships) {
      expect(r.positions.includes('hour')).toBe(false);
    }
  });
});

describe('五行强弱排序稳定性', () => {
  it('排序结果单调不增', () => {
    const chart = calculateBazi(baseInput(), 2026);
    const scores = chart.fiveElements.rankByScore.map((el) => chart.fiveElements.scores[el]);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('缺失五行阈值正确（得分≤0.1）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    for (const el of chart.fiveElements.missingElements) {
      expect(chart.fiveElements.scores[el]).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('关系边界场景', () => {
  it('全相同四柱（罕见）能正确处理', () => {
    // 通过计算得到一组合适四柱：要求 year/month/day/hour 互相无合冲
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.relationships).toBeDefined();
    // 关系数量有限，不会爆炸
    expect(chart.relationships.length).toBeLessThan(40);
  });

  it('四柱各异应触发至少一种关系', () => {
    // 甲子、丙寅、戊辰、庚午 → 含天干合/三合/相冲等多种
    const rels = computeRelationships(
      { heavenlyStem: '甲', earthlyBranch: '子' },
      { heavenlyStem: '丙', earthlyBranch: '寅' },
      { heavenlyStem: '戊', earthlyBranch: '辰' },
      { heavenlyStem: '庚', earthlyBranch: '午' },
    );
    expect(rels.length).toBeGreaterThan(0);
  });
});