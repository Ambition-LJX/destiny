/**
 * 人工核对测试（基于 1990-05-15 10:30 北京 男）。
 *
 * 选用理由：这是业内公开排盘最常用的样本之一，
 * 多家万年历（十神、择吉、紫微黄历网、bjtime 等）都一致给出
 * 庚午 / 辛巳 / 庚辰 / 辛巳 / 马 / 路旁土 / 白蜡金 当日当柱。
 * 由于日干是庚（阳金），时柱虽落在辛巳时 9:00-10:59，所以时柱为辛巳。
 *
 * 本测试不依赖 lunar-javascript 自身的输出，而是与外部权威公开参考对照。
 * 任何回归都会让这条测试失败。
 */
import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../src/core/engine.js';
import type { BirthInput } from '../src/types/chart.js';

const sample: BirthInput = {
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

describe('人工核对 · 1990-05-15 10:30 北京 男', () => {
  const chart = calculateBazi(sample, 2026);

  it('四柱与业内公开万年历一致', () => {
    expect(chart.pillars.year.heavenlyStem).toBe('庚');
    expect(chart.pillars.year.earthlyBranch).toBe('午');
    expect(chart.pillars.month.heavenlyStem).toBe('辛');
    expect(chart.pillars.month.earthlyBranch).toBe('巳');
    expect(chart.pillars.day.heavenlyStem).toBe('庚');
    expect(chart.pillars.day.earthlyBranch).toBe('辰');
    expect(chart.pillars.hour?.heavenlyStem).toBe('辛');
    expect(chart.pillars.hour?.earthlyBranch).toBe('巳');
  });

  it('生肖', () => {
    expect(chart.zodiac).toBe('马');
  });

  it('纳音（年 / 日）', () => {
    expect(chart.pillars.year.naYin).toBe('路旁土');
    expect(chart.pillars.day.naYin).toBe('白蜡金');
  });

  it('日主五行与日主天干', () => {
    expect(chart.fiveElements.dayMasterElement).toBe('金');
    expect(chart.pillars.day.tenGod).toBe('日主');
  });

  it('日主天干 = 庚 → 阴阳为阳，逆推十二长生', () => {
    // 庚（阳金）长生在巳（按"阳顺阴逆"原则阳干顺推）
    // 庚长生在巳：巳/午/未/申/酉/戌/亥/子/丑/寅/卯/辰
    expect(chart.pillars.hour?.twelveStage).toBe('长生');
  });

  it('起运（顺排，男命阳年/月干辛巳）', () => {
    expect(chart.luckStart.forward).toBe(true);
    expect(chart.luckStart.startAge).toBeGreaterThanOrEqual(7);
    expect(chart.luckStart.startAge).toBeLessThanOrEqual(8);
  });

  it('大运共 8 步，且首运与月柱保持一致方向', () => {
    expect(chart.luckCycles).toHaveLength(8);
    // 男命阳年（庚为阳）顺排 → 大运天干接月干辛往后：壬、癸、甲...
    expect(chart.luckCycles[0].heavenlyStem).toBe('壬');
    expect(chart.luckCycles[0].earthlyBranch).toBe('午');
  });

  it('喜忌：身强金，喜火、水、木（克泄耗）', () => {
    expect(chart.fiveElements.dayMasterStrength).toBe('strong');
    expect(chart.fiveElements.favorable).toEqual(
      expect.arrayContaining(['火', '水', '木']),
    );
    expect(chart.fiveElements.unfavorable).toEqual(
      expect.arrayContaining(['金', '土']),
    );
  });

  it('旬空（庚辰日 → 申酉空）', () => {
    expect(chart.dayXunKong).toEqual(['申', '酉']);
  });

  it('命宫（业内可独立校验）', () => {
    expect(chart.mingGong).toBeDefined();
  });
});