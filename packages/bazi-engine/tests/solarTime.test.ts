import { describe, it, expect } from 'vitest';
import {
  equationOfTimeMinutes,
  longitudeCorrectionMinutes,
  dayOfYear,
  computeSolarCorrection,
  applyCorrection,
} from '../src/core/solarTime.js';

describe('真太阳时校正', () => {
  it('经度时差：每偏离基准 1° 为 4 分钟', () => {
    expect(longitudeCorrectionMinutes(120)).toBe(0);
    expect(longitudeCorrectionMinutes(121)).toBe(4);
    expect(longitudeCorrectionMinutes(116)).toBe(-16);
  });

  it('dayOfYear 计算正确', () => {
    expect(dayOfYear(2000, 1, 1)).toBe(1);
    expect(dayOfYear(2000, 12, 31)).toBe(366); // 闰年
    expect(dayOfYear(2001, 12, 31)).toBe(365);
  });

  it('均时差在合理范围内（约 ±16 分钟）', () => {
    for (let d = 1; d <= 365; d += 10) {
      const eot = equationOfTimeMinutes(d);
      expect(eot).toBeGreaterThan(-20);
      expect(eot).toBeLessThan(20);
    }
  });

  it('北京（116.4°E）真太阳时早于钟表时间', () => {
    const corr = computeSolarCorrection(1990, 5, 15, 116.4);
    // 经度差 (116.4-120)*4 = -14.4 分钟，叠加均时差仍为负
    expect(corr.longitudeMinutes).toBeCloseTo(-14.4, 1);
    expect(corr.totalMinutes).toBeLessThan(0);
  });

  it('校正跨日进位正确', () => {
    const r = applyCorrection(2000, 1, 1, 0, 10, -20);
    expect(r.year).toBe(1999);
    expect(r.month).toBe(12);
    expect(r.day).toBe(31);
    expect(r.hour).toBe(23);
    expect(r.minute).toBe(50);
  });
});
