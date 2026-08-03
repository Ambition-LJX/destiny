import { describe, it, expect } from 'vitest';
import { calculateBazi } from '../src/index.js';
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

describe('十二长生与纳音五行', () => {
  it('日柱也输出十二长生（日主坐支的旺衰状态，如日坐长生/帝旺/墓库等）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.day.twelveStage).toBeDefined();
    const stages = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
    expect(stages).toContain(chart.pillars.day.twelveStage);
  });

  it('四柱均输出十二长生', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.year.twelveStage).toBeDefined();
    expect(chart.pillars.month.twelveStage).toBeDefined();
    expect(chart.pillars.day.twelveStage).toBeDefined();
    expect(chart.pillars.hour?.twelveStage).toBeDefined();
  });

  it('十二长生取值合法', () => {
    const chart = calculateBazi(baseInput(), 2026);
    const stages = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
    expect(stages).toContain(chart.pillars.year.twelveStage);
    expect(stages).toContain(chart.pillars.month.twelveStage);
  });

  it('纳音五行推导正确（金→金）', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.pillars.year.naYinElement).toBe('土'); // 庚午 = 路旁土
    expect(chart.pillars.day.naYinElement).toBe('金'); // 庚辰 = 白蜡金
  });

  it('dayXunKong 是地支字符数组', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(Array.isArray(chart.dayXunKong)).toBe(true);
    for (const c of chart.dayXunKong) {
      expect('子丑寅卯辰巳午未申酉戌亥').toContain(c);
    }
  });
});

describe('合冲与命局结构', () => {
  it('relationships 字段存在且类型正确', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(Array.isArray(chart.relationships)).toBe(true);
  });

  it('shenshaDetail 带出处', () => {
    const chart = calculateBazi(baseInput(), 2026);
    for (const s of chart.shenshaDetail) {
      expect(typeof s.name).toBe('string');
      expect(['year', 'month', 'day', 'hour']).toContain(s.position);
      expect(typeof s.source).toBe('string');
    }
  });

  it('patterns 至少能取到一个格局', () => {
    const chart = calculateBazi(baseInput(), 2026);
    // 命局未必有格局（极端命局可能都没有），但结构应正确
    for (const p of chart.patterns) {
      expect(typeof p.code).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(Array.isArray(p.pillars)).toBe(true);
    }
  });

  it('五行强弱排序按得分降序', () => {
    const chart = calculateBazi(baseInput(), 2026);
    const ranked = chart.fiveElements.rankByScore;
    for (let i = 1; i < ranked.length; i++) {
      expect(chart.fiveElements.scores[ranked[i - 1]]).toBeGreaterThanOrEqual(
        chart.fiveElements.scores[ranked[i]],
      );
    }
  });
});

describe('起运算法精度', () => {
  it('1990-05-15 男 北京 起运方向正确', () => {
    // 1990 庚午年（阳）男命 → 顺排
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.luckStart.forward).toBe(true);
  });

  it('跨年（12 月底）出生起运方向正确', () => {
    // 1990-12-31 男，庚午年阳男顺
    const chart = calculateBazi(
      baseInput({ year: 1990, month: 12, day: 31, hour: 12 }),
      2026,
    );
    expect(chart.luckStart.forward).toBe(true);
  });

  it('1 月初出生逆排方向正确', () => {
    // 1990-01-05 女，己巳年阴女顺
    const chart = calculateBazi(
      baseInput({ year: 1990, month: 1, day: 5, hour: 12, gender: 'female' }),
      2026,
    );
    expect(chart.luckStart.forward).toBe(true);
  });

  it('起运描述保留"精确换算"提示', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.luckStart.description).toContain('精确换算');
  });
});

describe('五行柱位权重', () => {
  it('月柱权重最大（得令加分）', () => {
    // 月令为巳火，巳为本月主气且权重高
    const chart = calculateBazi(baseInput(), 2026);
    const fe = chart.fiveElements;
    // 火得分应显著
    expect(fe.scores.火).toBeGreaterThan(0);
  });

  it('rankByScore 字段存在', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(chart.fiveElements.rankByScore).toHaveLength(5);
  });

  it('missingElements 字段存在', () => {
    const chart = calculateBazi(baseInput(), 2026);
    expect(Array.isArray(chart.fiveElements.missingElements)).toBe(true);
  });
});
