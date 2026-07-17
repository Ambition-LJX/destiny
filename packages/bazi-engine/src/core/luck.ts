import { Solar } from 'lunar-javascript';
import type { Element, Gender } from '../types/enums.js';
import type {
  LuckCycle,
  LuckStartInfo,
  YearFortune,
} from '../types/chart.js';
import type { NormalizedDateTime } from './calendar.js';
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  NAYIN_TABLE,
  STEM_ELEMENT,
  STEM_YINYANG,
  type HeavenlyStem,
  type EarthlyBranch,
} from '../constants/ganzhi.js';
import { calcTenGod } from '../constants/tenGods.js';

/**
 * 判断大运顺逆。
 * 阳年男 / 阴年女 顺排；阴年男 / 阳年女 逆排。
 * 年柱天干阴阳决定阴阳年。
 */
export function isForward(yearStem: HeavenlyStem, gender: Gender): boolean {
  const yang = STEM_YINYANG[yearStem] === '阳';
  const male = gender === 'male';
  return (yang && male) || (!yang && !male);
}

/**
 * 计算起运信息。
 *
 * 起运岁数：从出生到下一个（顺排）或上一个（逆排）节气的天数，
 * 每 3 天折合 1 岁，余数按 1 天=4 月、1 时辰=10 天换算（此处近似到月）。
 */
export function computeLuckStart(
  dt: NormalizedDateTime,
  yearStem: HeavenlyStem,
  gender: Gender,
): LuckStartInfo {
  const forward = isForward(yearStem, gender);
  const solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, 0);
  const lunar = solar.getLunar();

  // 使用 lunar-javascript 的节气表求最近节气
  const jieQiTable = lunar.getJieQiTable();
  const birthTime = new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute).getTime();

  // 仅取"节"（12 个月令分界），过滤掉"气"
  const JIE_NAMES = [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
    '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
  ];

  const jieTimes: number[] = [];
  for (const name of JIE_NAMES) {
    const s = jieQiTable[name];
    if (s) {
      jieTimes.push(
        new Date(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()).getTime(),
      );
    }
  }
  jieTimes.sort((a, b) => a - b);

  let targetTime: number | null = null;
  if (forward) {
    targetTime = jieTimes.find((t) => t > birthTime) ?? null;
  } else {
    const past = jieTimes.filter((t) => t < birthTime);
    targetTime = past.length ? past[past.length - 1] : null;
  }

  let days = 3 * 365; // 兜底：无节气数据时给一个占位（约 1 岁附近）
  if (targetTime !== null) {
    days = Math.abs(targetTime - birthTime) / 86_400_000;
  }

  // 3 天 = 1 岁
  const ageFloat = days / 3;
  const startAge = Math.max(1, Math.round(ageFloat));
  const months = Math.round((ageFloat - Math.floor(ageFloat)) * 12);

  return {
    forward,
    startAge,
    startYear: dt.year + startAge,
    description: `约 ${Math.floor(ageFloat)} 岁 ${months} 个月起运（${forward ? '顺排' : '逆排'}）`,
  };
}

/**
 * 排布大运（默认 8 步，覆盖约 80 年）。
 */
export function computeLuckCycles(
  monthStem: string,
  monthBranch: string,
  dayMaster: HeavenlyStem,
  luckStart: LuckStartInfo,
  steps = 8,
): LuckCycle[] {
  const stemIdx = HEAVENLY_STEMS.indexOf(monthStem as HeavenlyStem);
  const branchIdx = EARTHLY_BRANCHES.indexOf(monthBranch as EarthlyBranch);
  const dir = luckStart.forward ? 1 : -1;

  const cycles: LuckCycle[] = [];
  for (let i = 1; i <= steps; i++) {
    const sIdx = (((stemIdx + dir * i) % 10) + 10) % 10;
    const bIdx = (((branchIdx + dir * i) % 12) + 12) % 12;
    const stem = HEAVENLY_STEMS[sIdx];
    const branch = EARTHLY_BRANCHES[bIdx];
    const startAge = luckStart.startAge + (i - 1) * 10;
    const startYear = luckStart.startYear + (i - 1) * 10;

    cycles.push({
      index: i,
      startAge,
      startYear,
      endYear: startYear + 9,
      heavenlyStem: stem,
      earthlyBranch: branch,
      tenGod: calcTenGod(dayMaster, stem),
      naYin: NAYIN_TABLE[`${stem}${branch}`] ?? '未知',
      element: STEM_ELEMENT[stem],
    });
  }
  return cycles;
}

/**
 * 计算指定公历年份的流年。
 */
export function computeYearFortune(
  targetYear: number,
  birthYear: number,
  dayMaster: HeavenlyStem,
): YearFortune {
  // 以立春为界的干支年，用 lunar-javascript 取该年立春后的年柱
  const solar = Solar.fromYmdHms(targetYear, 6, 1, 12, 0, 0);
  const lunar = solar.getLunar();
  const stem = lunar.getYearGanByLiChun();
  const branch = lunar.getYearZhiByLiChun();

  return {
    year: targetYear,
    heavenlyStem: stem,
    earthlyBranch: branch,
    tenGod: calcTenGod(dayMaster, stem as HeavenlyStem),
    naYin: NAYIN_TABLE[`${stem}${branch}`] ?? '未知',
    element: STEM_ELEMENT[stem as HeavenlyStem],
    age: targetYear - birthYear + 1,
  };
}

/**
 * 给定五行，返回喜忌判定辅助（供报告层使用）。
 */
export function elementFavorability(
  element: Element,
  favorable: Element[],
  unfavorable: Element[],
): 'favorable' | 'unfavorable' | 'neutral' {
  if (favorable.includes(element)) return 'favorable';
  if (unfavorable.includes(element)) return 'unfavorable';
  return 'neutral';
}
