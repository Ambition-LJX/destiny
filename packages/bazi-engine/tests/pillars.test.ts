import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../src/index.js';
import type { BirthInput } from '../src/index.js';

/**
 * 四柱排盘黄金测试集。
 * 参考值由公历时刻经 lunar-javascript 天文算法推算，并与常见排盘软件核对。
 */

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

describe('四柱排盘', () => {
  it('1990-05-15 10:30 男（不校正真太阳时）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.year.heavenlyStem).toBe('庚');
    expect(chart.pillars.year.earthlyBranch).toBe('午');
    expect(chart.pillars.month.heavenlyStem).toBe('辛');
    expect(chart.pillars.month.earthlyBranch).toBe('巳');
    expect(chart.pillars.day.heavenlyStem).toBe('庚');
    expect(chart.pillars.day.earthlyBranch).toBe('辰');
    expect(chart.pillars.hour?.heavenlyStem).toBe('辛');
    expect(chart.pillars.hour?.earthlyBranch).toBe('巳');
  });

  it('2000-01-01 00:00 子时换日', () => {
    const chart = calculateBazi(
      baseInput({ year: 2000, month: 1, day: 1, hour: 0, minute: 0 }),
      2026,
    );
    expect(chart.pillars.year.heavenlyStem).toBe('己');
    expect(chart.pillars.year.earthlyBranch).toBe('卯');
    expect(chart.pillars.day.heavenlyStem).toBe('戊');
    expect(chart.pillars.day.earthlyBranch).toBe('午');
    expect(chart.pillars.hour?.earthlyBranch).toBe('子');
  });

  it('1984-02-02 12:00 立春前仍属上一年（癸亥年）', () => {
    const chart = calculateBazi(
      baseInput({ year: 1984, month: 2, day: 2, hour: 12, minute: 0 }),
      2026,
    );
    // 1984 立春在 2 月 4 日，2 月 2 日仍属癸亥年
    expect(chart.pillars.year.heavenlyStem).toBe('癸');
    expect(chart.pillars.year.earthlyBranch).toBe('亥');
  });

  it('日主为日柱天干', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.day.tenGod).toBe('日主');
    expect(chart.fiveElements.dayMasterElement).toBe('金');
  });

  it('时辰未知时不产出时柱', () => {
    const chart = calculateBazi(baseInput({ hour: null, minute: null }), 2026);
    expect(chart.pillars.hour).toBeNull();
    expect(chart.meta.hourKnown).toBe(false);
  });

  it('农历输入换算为公历后排盘一致', () => {
    const solarChart = calculateBazi(
      baseInput({ year: 2000, month: 6, day: 6, hour: 12, minute: 0 }),
      2026,
    );
    const lunarChart = calculateBazi(
      baseInput({ calendar: 'lunar', year: 2000, month: 5, day: 5, hour: 12, minute: 0 }),
      2026,
    );
    expect(lunarChart.pillars.day.heavenlyStem).toBe(solarChart.pillars.day.heavenlyStem);
    expect(lunarChart.pillars.day.earthlyBranch).toBe(solarChart.pillars.day.earthlyBranch);
  });

  it('纳音正确（庚午=路旁土）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.year.naYin).toBe('路旁土');
  });

  it('生肖正确（1990 属马）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.zodiac).toBe('马');
  });
});
