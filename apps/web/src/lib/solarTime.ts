/**
 * 时辰地支对应的钟表时间范围。
 * 子时（晚 23:00 - 01:00）、丑时（01:00 - 03:00）... 亥时（21:00 - 23:00）
 */
export const HOUR_BRANCH_RANGES: { branch: string; start: number; end: number }[] = [
  { branch: '子', start: 23, end: 1 },
  { branch: '丑', start: 1, end: 3 },
  { branch: '寅', start: 3, end: 5 },
  { branch: '卯', start: 5, end: 7 },
  { branch: '辰', start: 7, end: 9 },
  { branch: '巳', start: 9, end: 11 },
  { branch: '午', start: 11, end: 13 },
  { branch: '未', start: 13, end: 15 },
  { branch: '申', start: 15, end: 17 },
  { branch: '酉', start: 17, end: 19 },
  { branch: '戌', start: 19, end: 21 },
  { branch: '亥', start: 21, end: 23 },
];

/** 真太阳时校正量（中国北京时 120°E 基准） */
const STANDARD_MERIDIAN = 120;

/**
 * 计算给定经度的经度时差（分钟）。
 * 每偏离基准 1° 时间差 4 分钟。
 */
export function longitudeCorrectionMinutes(longitude: number): number {
  return (longitude - STANDARD_MERIDIAN) * 4;
}

/**
 * 估算真太阳时校正量（分钟）。
 * 这里采用均时差的近似公式（简化版），用于前端展示。
 */
export function estimateSolarCorrectionMinutes(
  longitude: number,
  month: number,
  day: number,
): number {
  const lon = longitudeCorrectionMinutes(longitude);
  // 均时差近似公式：B = (2π × (N - 81)) / 364
  const date = new Date(2000, month - 1, day);
  const start = new Date(2000, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return Math.round(lon + eot);
}

/**
 * 根据钟表时间 + 校正分钟数，得到真太阳时下的钟表时间（HH:MM）。
 */
export function applyClockCorrection(
  hour: number,
  minute: number,
  correctionMinutes: number,
): { hour: number; minute: number; crossesDay: boolean } {
  let totalMinutes = hour * 60 + minute + correctionMinutes;
  const crossesDay = totalMinutes < 0 || totalMinutes >= 24 * 60;
  totalMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
    crossesDay,
  };
}

/**
 * 给定时分，返回对应时辰地支名。
 */
export function getHourBranch(hour: number, minute: number): string {
  const totalMinutes = hour * 60 + minute;
  for (const r of HOUR_BRANCH_RANGES) {
    if (r.start < r.end) {
      if (totalMinutes >= r.start * 60 && totalMinutes < r.end * 60) return r.branch;
    } else {
      // 跨日（子时 23:00 - 01:00）
      if (totalMinutes >= r.start * 60 || totalMinutes < r.end * 60) return r.branch;
    }
  }
  return '?';
}

/**
 * 格式化分钟数为 HH:MM。
 */
export function formatHM(hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
}
