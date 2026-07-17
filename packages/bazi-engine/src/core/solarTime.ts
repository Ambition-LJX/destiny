/**
 * 真太阳时校正。
 *
 * 钟表时间（北京时间，东经 120°基准）→ 真太阳时。
 * 校正 = 经度时差 + 均时差（Equation of Time）。
 */

/** 中国标准时区基准经度（东经 120°） */
const STANDARD_MERIDIAN = 120;

/**
 * 计算某日的均时差（分钟）。
 * 使用近似天文公式，误差在秒级，满足排盘需求。
 *
 * @param dayOfYear 一年中的第几天（1-366）
 */
export function equationOfTimeMinutes(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  // 经典近似：E = 9.87 sin(2B) - 7.53 cos(B) - 1.5 sin(B)
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 计算给定公历日期在一年中的天序（1-based）。
 */
export function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

/**
 * 经度时差（分钟）。
 * 每偏离基准经度 1°，时间差 4 分钟。东经大于基准则真太阳时更早（正校正）。
 */
export function longitudeCorrectionMinutes(longitude: number): number {
  return (longitude - STANDARD_MERIDIAN) * 4;
}

export interface SolarTimeCorrection {
  /** 总校正分钟数（加到钟表时间上得到真太阳时） */
  totalMinutes: number;
  longitudeMinutes: number;
  equationOfTimeMinutes: number;
}

/**
 * 计算真太阳时校正量。
 */
export function computeSolarCorrection(
  year: number,
  month: number,
  day: number,
  longitude: number,
): SolarTimeCorrection {
  const lon = longitudeCorrectionMinutes(longitude);
  const eot = equationOfTimeMinutes(dayOfYear(year, month, day));
  return {
    totalMinutes: lon + eot,
    longitudeMinutes: lon,
    equationOfTimeMinutes: eot,
  };
}

/**
 * 把钟表时间（分钟精度）加上校正量，返回校正后的年月日时分。
 * 处理跨日进位。
 */
export function applyCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  correctionMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute));
  base.setUTCMinutes(base.getUTCMinutes() + Math.round(correctionMinutes));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
    hour: base.getUTCHours(),
    minute: base.getUTCMinutes(),
  };
}
