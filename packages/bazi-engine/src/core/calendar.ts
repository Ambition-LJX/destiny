import { Solar, Lunar } from 'lunar-javascript';
import type { BirthInput } from '../types/chart.js';
import { applyCorrection, computeSolarCorrection } from './solarTime.js';

/**
 * 归一化后的公历时刻（用于排盘的最终时间）。
 */
export interface NormalizedDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 时辰是否已知 */
  hourKnown: boolean;
  /** 真太阳时是否已应用 */
  trueSolarTimeApplied: boolean;
  /** 真太阳时校正的分钟数 */
  correctionMinutes: number;
}

/**
 * 四柱干支（原始字符串）。
 */
export interface RawPillars {
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string | null;
  hourBranch: string | null;
}

/**
 * 将输入（可能是农历）统一换算为公历，并应用真太阳时校正。
 */
export function normalizeToSolar(input: BirthInput): NormalizedDateTime {
  const hourKnown = input.hour !== null;
  const hour = input.hour ?? 12; // 时辰未知时用正午占位，仅用于日期换算，不产出时柱
  const minute = input.minute ?? 0;

  // 农历 → 公历
  let sYear = input.year;
  let sMonth = input.month;
  let sDay = input.day;

  if (input.calendar === 'lunar') {
    const leapMonth = input.isLeapMonth ? -input.month : input.month;
    const lunar = Lunar.fromYmdHms(
      input.year,
      leapMonth,
      input.day,
      hour,
      minute,
      0,
    );
    const solar = lunar.getSolar();
    sYear = solar.getYear();
    sMonth = solar.getMonth();
    sDay = solar.getDay();
  }

  // 真太阳时校正
  let corrMinutes = 0;
  let cy = sYear;
  let cm = sMonth;
  let cd = sDay;
  let ch = hour;
  let cmin = minute;

  if (input.useTrueSolarTime && hourKnown) {
    const corr = computeSolarCorrection(sYear, sMonth, sDay, input.longitude);
    corrMinutes = corr.totalMinutes;
    const adjusted = applyCorrection(sYear, sMonth, sDay, hour, minute, corrMinutes);
    cy = adjusted.year;
    cm = adjusted.month;
    cd = adjusted.day;
    ch = adjusted.hour;
    cmin = adjusted.minute;
  }

  return {
    year: cy,
    month: cm,
    day: cd,
    hour: ch,
    minute: cmin,
    hourKnown,
    trueSolarTimeApplied: input.useTrueSolarTime && hourKnown,
    correctionMinutes: Math.round(corrMinutes),
  };
}

/**
 * 从归一化公历时刻计算四柱。
 * 使用 lunar-javascript 的八字接口，其月柱以节气为界、日柱以晚子时换日。
 */
export function computeRawPillars(dt: NormalizedDateTime): RawPillars {
  const solar = Solar.fromYmdHms(
    dt.year,
    dt.month,
    dt.day,
    dt.hour,
    dt.minute,
    0,
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  return {
    yearStem: eightChar.getYearGan(),
    yearBranch: eightChar.getYearZhi(),
    monthStem: eightChar.getMonthGan(),
    monthBranch: eightChar.getMonthZhi(),
    dayStem: eightChar.getDayGan(),
    dayBranch: eightChar.getDayZhi(),
    hourStem: dt.hourKnown ? eightChar.getTimeGan() : null,
    hourBranch: dt.hourKnown ? eightChar.getTimeZhi() : null,
  };
}

/**
 * 计算生肖。
 */
export function computeZodiac(dt: NormalizedDateTime): string {
  const solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, 0);
  return solar.getLunar().getYearShengXiao();
}
