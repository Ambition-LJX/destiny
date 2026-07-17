import type { BirthInput, BaziChart } from '../types/chart.js';
import { validateBirthInput } from './validate.js';
import {
  normalizeToSolar,
  computeRawPillars,
  computeZodiac,
} from './calendar.js';
import { buildPillar } from './pillars.js';
import { computeFiveElements } from './fiveElements.js';
import {
  computeLuckStart,
  computeLuckCycles,
  computeYearFortune,
} from './luck.js';
import { computeShensha } from './shensha.js';
import type { HeavenlyStem } from '../constants/ganzhi.js';

/** 引擎版本，用于结果复现与回归。 */
export const ENGINE_VERSION = '1.0.0';

/**
 * 排盘主入口：纯函数，无 I/O，确定性可复现。
 *
 * @param input 出生信息
 * @param referenceYear 用于计算"当前流年"的参考公历年份，默认取当前年
 */
export function calculateBazi(
  input: BirthInput,
  referenceYear: number = new Date().getFullYear(),
): BaziChart {
  validateBirthInput(input);

  const normalized = normalizeToSolar(input);
  const raw = computeRawPillars(normalized);
  const dayMaster = raw.dayStem as HeavenlyStem;

  const yearPillar = buildPillar(dayMaster, raw.yearStem, raw.yearBranch);
  const monthPillar = buildPillar(dayMaster, raw.monthStem, raw.monthBranch);
  const dayPillar = buildPillar(dayMaster, raw.dayStem, raw.dayBranch, true);
  const hourPillar =
    raw.hourStem && raw.hourBranch
      ? buildPillar(dayMaster, raw.hourStem, raw.hourBranch)
      : null;

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  const fiveElements = computeFiveElements(pillars);

  const luckStart = computeLuckStart(normalized, raw.yearStem as HeavenlyStem, input.gender);
  const luckCycles = computeLuckCycles(
    raw.monthStem,
    raw.monthBranch,
    dayMaster,
    luckStart,
  );

  const currentYear = computeYearFortune(referenceYear, normalized.year, dayMaster);

  const shensha = computeShensha(raw);
  const zodiac = computeZodiac(normalized);

  const solarDatetime = new Date(
    Date.UTC(
      normalized.year,
      normalized.month - 1,
      normalized.day,
      normalized.hour,
      normalized.minute,
    ),
  ).toISOString();

  return {
    engineVersion: ENGINE_VERSION,
    pillars,
    fiveElements,
    luckStart,
    luckCycles,
    currentYear,
    shensha,
    zodiac,
    meta: {
      trueSolarTimeApplied: normalized.trueSolarTimeApplied,
      hourKnown: normalized.hourKnown,
      solarDatetime,
      trueSolarCorrectionMinutes: normalized.correctionMinutes,
      gender: input.gender,
      longitude: input.longitude,
      latitude: input.latitude,
    },
  };
}
