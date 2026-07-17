import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../src/core/engine.js';
import { BaziInputError } from '../src/core/validate.js';
import type { BirthInput } from '../src/types/chart.js';

const baseInput: BirthInput = {
  calendar: 'solar',
  year: 1990,
  month: 5,
  day: 15,
  hour: 10,
  minute: 30,
  gender: 'male',
  longitude: 116.4,
  latitude: 39.9,
  useTrueSolarTime: true,
};

describe('calculateBazi 端到端', () => {
  it('1990-05-15 10:30 男 北京 结果稳定', () => {
    const chart = calculateBazi(baseInput, 2026);
    expect(chart.pillars.year.heavenlyStem).toBe('庚');
    expect(chart.pillars.year.earthlyBranch).toBe('午');
    expect(chart.pillars.month.heavenlyStem).toBe('辛');
    expect(chart.pillars.month.earthlyBranch).toBe('巳');
    expect(chart.pillars.day.heavenlyStem).toBe('庚');
    expect(chart.pillars.day.earthlyBranch).toBe('辰');
    expect(chart.pillars.day.tenGod).toBe('日主');
    expect(chart.zodiac).toBe('马');
    expect(chart.engineVersion).toBe('1.0.0');
  });

  it('结果可复现（相同输入 → 相同输出）', () => {
    const a = calculateBazi(baseInput, 2026);
    const b = calculateBazi(baseInput, 2026);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('时辰未知：时柱为 null 且 meta 标记', () => {
    const chart = calculateBazi(
      { ...baseInput, hour: null, minute: null, useTrueSolarTime: false },
      2026,
    );
    expect(chart.pillars.hour).toBeNull();
    expect(chart.meta.hourKnown).toBe(false);
  });

  it('大运共 8 步且年龄递增', () => {
    const chart = calculateBazi(baseInput, 2026);
    expect(chart.luckCycles).toHaveLength(8);
    for (let i = 1; i < chart.luckCycles.length; i++) {
      expect(chart.luckCycles[i].startAge).toBeGreaterThan(
        chart.luckCycles[i - 1].startAge,
      );
    }
  });

  it('农历输入换算正确（农历 2000-05-05 → 公历 2000-06-06）', () => {
    const chart = calculateBazi(
      {
        ...baseInput,
        calendar: 'lunar',
        year: 2000,
        month: 5,
        day: 5,
        hour: 12,
        useTrueSolarTime: false,
      },
      2026,
    );
    expect(chart.meta.solarDatetime.startsWith('2000-06-06')).toBe(true);
  });

  it('真太阳时校正：北京经度产生负偏移', () => {
    const chart = calculateBazi(baseInput, 2026);
    expect(chart.meta.trueSolarTimeApplied).toBe(true);
    expect(chart.meta.trueSolarCorrectionMinutes).toBeLessThan(0);
  });

  it('非法输入抛出 BaziInputError', () => {
    expect(() => calculateBazi({ ...baseInput, month: 13 }, 2026)).toThrow(
      BaziInputError,
    );
    expect(() => calculateBazi({ ...baseInput, longitude: 999 }, 2026)).toThrow(
      BaziInputError,
    );
  });

  it('女命逆排大运方向正确', () => {
    const chart = calculateBazi({ ...baseInput, gender: 'female' }, 2026);
    // 庚午年（阳年）女命 → 逆排
    expect(chart.luckStart.forward).toBe(false);
  });
});
