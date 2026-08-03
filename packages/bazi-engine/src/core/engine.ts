import type {
  BaziChart,
  BirthInput,
  FiveElementsResult,
  Pattern,
  ShenshaItem,
} from '../types/chart.js';
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
  computeLuckTransitions,
  computeYearFortune,
} from './luck.js';
import { computeShensha } from './shensha.js';
import { computeRelationships } from './relationships.js';
import { computePatterns } from './patterns.js';
import { Solar } from 'lunar-javascript';
import type { HeavenlyStem } from '../constants/ganzhi.js';

/** 引擎版本，用于结果复现与回归。 */
export const ENGINE_VERSION = '1.1.0';

/**
 * 排盘主入口：纯函数，无 I/O，确定性可复现。
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

  const fiveElements: FiveElementsResult = computeFiveElements(pillars);

  const luckStart = computeLuckStart(
    normalized,
    raw.yearStem as HeavenlyStem,
    input.gender,
  );
  const luckCycles = computeLuckCycles(
    raw.monthStem,
    raw.monthBranch,
    dayMaster,
    luckStart,
  );
  const luckTransitions = computeLuckTransitions(luckCycles);

  const currentYear = computeYearFortune(
    referenceYear,
    normalized.year,
    dayMaster,
  );

  // 神煞（带出处）
  const rawShensha = computeShensha(raw, dayMaster);
  const shenshaDetail: ShenshaItem[] = rawShensha.map((s) => ({
    name: s.name,
    position: s.position,
    source: s.source,
  }));
  const shensha = Array.from(new Set(shenshaDetail.map((s) => s.name)));

  // 合冲关系
  const relationships = computeRelationships(
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  );

  // 命局格局
  const patterns: Pattern[] = computePatterns(
    pillars,
    dayMaster,
    fiveElements.dayMasterStrength,
    fiveElements.favorable,
  );

  // 日柱旬空 + 命宫（来自 lunar-javascript）
  let dayXunKong: string[] = [];
  let mingGong: string | undefined;
  try {
    const solarForLunar = Solar.fromYmdHms(
      normalized.year,
      normalized.month,
      normalized.day,
      normalized.hour,
      normalized.minute,
      0,
    );
    const lunar = solarForLunar.getLunar();
    const xk = lunar.getDayXunKong?.();
    if (xk) {
      dayXunKong = xk
        .split('')
        .filter((c: string) => /[子丑寅卯辰巳午未申酉戌亥]/.test(c));
    }
    const ec = lunar.getEightChar?.();
    if (ec) {
      const mg = ec.getMingGong?.();
      if (mg) mingGong = mg;
    }
  } catch {
    // 旬空/命宫查不到不影响主结果
  }

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
    luckTransitions,
    currentYear,
    shensha,
    shenshaDetail,
    relationships,
    patterns,
    dayXunKong,
    mingGong,
    zodiac: computeZodiac(normalized),
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
