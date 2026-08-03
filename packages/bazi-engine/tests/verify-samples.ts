import { calculateBazi } from '../src/index.js';
import type { BirthInput } from '../src/index.js';

/**
 * 把指定样本用引擎跑一遍，并把关键字段输出到控制台。
 * 用于人工核对（与业内公开排盘结果做对照）。
 */

const SAMPLES: { name: string; input: BirthInput }[] = [
  {
    name: '样本A · 1990-05-15 10:30 北京 男（业内常用公开样本）',
    input: {
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
    },
  },
  {
    name: '样本B · 1985-01-05 23:45 上海 男（跨立春+子时边界）',
    input: {
      calendar: 'solar',
      year: 1985,
      month: 1,
      day: 5,
      hour: 23,
      minute: 45,
      gender: 'male',
      longitude: 121.47,
      latitude: 31.23,
      useTrueSolarTime: true,
    },
  },
  {
    name: '样本C · 1991-02-15 06:00 哈尔滨 男（立春后+卯时）',
    input: {
      calendar: 'solar',
      year: 1991,
      month: 2,
      day: 15,
      hour: 6,
      minute: 0,
      gender: 'male',
      longitude: 126.65,
      latitude: 45.75,
      useTrueSolarTime: true,
    },
  },
];

for (const s of SAMPLES) {
  const chart = calculateBazi(s.input, 2026);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(
    {
      name: s.name,
      pillars: {
        year: chart.pillars.year.heavenlyStem + chart.pillars.year.earthlyBranch,
        month: chart.pillars.month.heavenlyStem + chart.pillars.month.earthlyBranch,
        day: chart.pillars.day.heavenlyStem + chart.pillars.day.earthlyBranch,
        hour: chart.pillars.hour
          ? chart.pillars.hour.heavenlyStem + chart.pillars.hour.earthlyBranch
          : null,
      },
      zodiac: chart.zodiac,
      naYin: {
        year: chart.pillars.year.naYin,
        month: chart.pillars.month.naYin,
        day: chart.pillars.day.naYin,
        hour: chart.pillars.hour?.naYin ?? null,
      },
      twelveStage: {
        year: chart.pillars.year.twelveStage,
        month: chart.pillars.month.twelveStage,
        hour: chart.pillars.hour?.twelveStage,
      },
      dayMaster: chart.pillars.day.heavenlyStem,
      dayMasterElement: chart.fiveElements.dayMasterElement,
      dayMasterStrength: chart.fiveElements.dayMasterStrength,
      favorable: chart.fiveElements.favorable,
      unfavorable: chart.fiveElements.unfavorable,
      luckStart: chart.luckStart,
      luckCycles: chart.luckCycles.map((c) => ({
        age: c.startAge,
        year: c.startYear,
        pillar: c.heavenlyStem + c.earthlyBranch,
        tenGod: c.tenGod,
      })),
      currentYear: chart.currentYear,
      relationships: chart.relationships.map((r) => ({
        kind: r.kind,
        positions: r.positions,
        chars: r.chars,
        transformed: r.transformed,
      })),
      patterns: chart.patterns.map((p) => p.name),
      shensha: chart.shensha,
      dayXunKong: chart.dayXunKong,
      mingGong: chart.mingGong,
      engineVersion: chart.engineVersion,
    },
    null,
    2,
  ));
  // eslint-disable-next-line no-console
  console.log('---');
}