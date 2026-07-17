import type { RawPillars } from './calendar.js';
import type { HeavenlyStem, EarthlyBranch } from '../constants/ganzhi.js';

/**
 * 神煞计算（选取常见、判定明确的几种）。
 * 仅作参考性扩展，不参与旺衰与喜用神判定。
 */

/** 天乙贵人：以日干（或年干）查对应地支 */
const TIANYI_GUIREN: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
  辛: ['寅', '午'],
};

/** 文昌贵人：以日干查地支 */
const WENCHANG: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
};

/** 桃花（咸池）：以年支或日支查 */
const TAOHUA: Record<EarthlyBranch, EarthlyBranch> = {
  申: '酉',
  子: '酉',
  辰: '酉',
  寅: '卯',
  午: '卯',
  戌: '卯',
  巳: '午',
  酉: '午',
  丑: '午',
  亥: '子',
  卯: '子',
  未: '子',
};

/** 驿马：以年支或日支查 */
const YIMA: Record<EarthlyBranch, EarthlyBranch> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
};

/** 华盖：以年支或日支查 */
const HUAGAI: Record<EarthlyBranch, EarthlyBranch> = {
  申: '辰',
  子: '辰',
  辰: '辰',
  寅: '戌',
  午: '戌',
  戌: '戌',
  巳: '丑',
  酉: '丑',
  丑: '丑',
  亥: '未',
  卯: '未',
  未: '未',
};

/**
 * 计算神煞列表。
 */
export function computeShensha(pillars: RawPillars): string[] {
  const result = new Set<string>();

  const dayStem = pillars.dayStem as HeavenlyStem;
  const yearBranch = pillars.yearBranch as EarthlyBranch;
  const dayBranch = pillars.dayBranch as EarthlyBranch;

  const allBranches: (EarthlyBranch | null)[] = [
    pillars.yearBranch as EarthlyBranch,
    pillars.monthBranch as EarthlyBranch,
    pillars.dayBranch as EarthlyBranch,
    pillars.hourBranch as EarthlyBranch | null,
  ];
  const branchSet = new Set(allBranches.filter((b): b is EarthlyBranch => b !== null));

  // 天乙贵人
  for (const target of TIANYI_GUIREN[dayStem] ?? []) {
    if (branchSet.has(target)) result.add('天乙贵人');
  }
  // 文昌贵人
  if (branchSet.has(WENCHANG[dayStem])) result.add('文昌贵人');

  // 桃花 / 驿马 / 华盖（年支与日支各查一次）
  for (const base of [yearBranch, dayBranch]) {
    if (branchSet.has(TAOHUA[base])) result.add('桃花');
    if (branchSet.has(YIMA[base])) result.add('驿马');
    if (branchSet.has(HUAGAI[base])) result.add('华盖');
  }

  return [...result];
}
