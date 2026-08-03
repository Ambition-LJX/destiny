import { Solar } from 'lunar-javascript';
import type { Element, Gender } from '../types/enums.js';
import type {
  LuckCycle,
  LuckStartInfo,
  LuckTransition,
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
 * 算法（精确版）：
 * 1. 顺排找出生时刻之后的下一个"节"；逆排找上一个"节"
 * 2. 求出生时刻与目标节气的精确时间差（以小时为单位）
 * 3. 换算：
 *    - 3 天 = 1 岁（72 小时 = 1 岁）
 *    - 1 天 = 4 个月（24 小时 = 4 个月 → 1 小时 = 1 个月？实际传统为 1 天 4 个月，余数时辰折算）
 *    - 1 时辰 (2 小时) = 10 天
 * 4. 返回起运虚岁、起运公历年份、与精确描述（几岁几月起运）
 *
 * 使用 lunar-javascript 的 getPrevJie/getNextJie，自动处理跨年。
 */
export function computeLuckStart(
  dt: NormalizedDateTime,
  yearStem: HeavenlyStem,
  gender: Gender,
): LuckStartInfo {
  const forward = isForward(yearStem, gender);
  const solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, 0);
  const lunar = solar.getLunar();

  // 使用 lunar-javascript 的接口，避免跨年问题
  // wholeDay=false → 按精确时刻匹配（按命理起运应精确到分钟）
  const target = forward ? lunar.getNextJie(false) : lunar.getPrevJie(false);

  // 出生时间戳（毫秒）
  const birthMs = Date.UTC(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute);

  let days = 3 * 365; // 兜底
  if (target && typeof target.getSolar === 'function') {
    const targetSolar = target.getSolar();
    const targetMs = Date.UTC(
      targetSolar.getYear(),
      targetSolar.getMonth() - 1,
      targetSolar.getDay(),
      targetSolar.getHour(),
      targetSolar.getMinute(),
    );
    days = Math.abs(targetMs - birthMs) / 86_400_000;
  }

  // 严格换算：
  // - 整年数 = floor(days / 3)
  // - 余天 = days - 整年数*3
  // - 月数（粗算）= 余天 * 4  // 1 天 = 4 个月
  // - 时辰折算：1 天 = 12 时辰；1 时辰 = 10 天 ≈ 1/3 个月
  const yearsWhole = Math.floor(days / 3);
  const remainingDays = days - yearsWhole * 3;

  // 1) 剩余天数先折月：1 天 = 4 个月
  const monthsFromDays = remainingDays * 4;
  // 2) 把剩余天数转时辰：1 天 = 12 时辰
  const remainingShiChen = remainingDays * 12;
  // 3) 时辰折算：1 时辰 = 10 天 → 等价 1/3 个月
  const fractionalMonths = Math.round((monthsFromDays + remainingShiChen * (10 / 30)) * 10) / 10;

  // 起运虚岁（取整，3 天=1 岁的整数部分）
  const startAge = Math.max(1, yearsWhole);

  // 整数月（4 舍 5 入到月）
  const monthsWhole = Math.round(fractionalMonths);
  // 规范化为 0-11（防止 12 月进位回年份）
  const finalYears = startAge + Math.floor(monthsWhole / 12);
  const finalMonths = monthsWhole % 12;

  return {
    forward,
    startAge: finalYears,
    startYear: dt.year + finalYears,
    description: `约 ${finalYears} 岁 ${finalMonths} 个月起运（${forward ? '顺排' : '逆排'}，按"3天折1岁、1天折4月、1时辰折10天"精确换算）`,
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
 * 计算大运交接点（前后大运切换的"交脱年"）。
 *
 * 命理口径：每步大运交接前后各 1-2 年常伴随生活节奏变化（搬家、换工作、感情转变等）。
 * 此函数标记每年 1 月 1 日作为切换点；前后大运对照输出。
 */
export function computeLuckTransitions(cycles: LuckCycle[]): LuckTransition[] {
  const transitions: LuckTransition[] = [];
  for (let i = 1; i < cycles.length; i++) {
    const prev = cycles[i - 1];
    const next = cycles[i];
    transitions.push({
      year: next.startYear,
      nextIndex: next.index,
      nextPillar: `${next.heavenlyStem}${next.earthlyBranch}`,
      prevPillar: `${prev.heavenlyStem}${prev.earthlyBranch}`,
      note: `${next.startYear} 年由 ${prev.heavenlyStem}${prev.earthlyBranch} 运交脱进入 ${next.heavenlyStem}${next.earthlyBranch} 运，前一年+当年节奏常有变动（工作/搬迁/感情），建议稳守节奏、避免重大决策。`,
    });
  }
  return transitions;
}

/**
 * 计算指定公历年份的流年（按立春分界）。
 */
export function computeYearFortune(
  targetYear: number,
  birthYear: number,
  dayMaster: HeavenlyStem,
): YearFortune {
  // 6 月 1 日已在立春后，是安全的"该年立春后"取样点
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
