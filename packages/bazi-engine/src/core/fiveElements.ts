import type { Element } from '../types/enums.js';
import type { FiveElementsResult, Pillar } from '../types/chart.js';
import {
  BRANCH_HIDDEN_STEMS,
  ELEMENT_GENERATED_BY,
  ELEMENT_GENERATES,
  ELEMENT_OVERCOME_BY,
  ELEMENT_OVERCOMES,
  STEM_ELEMENT,
  type EarthlyBranch,
  type HeavenlyStem,
} from '../constants/ganzhi.js';

const ALL_ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

/**
 * 月令对当令五行的加权（得令）。月支本气五行力量加成。
 * 注：精确命理中"得气"会随出生日距节气交节天数线性变化，
 * 此处采用简化版本：本气 + 80%。
 */
const MONTH_ORDER_BONUS = 1.8;

/**
 * 柱位权重：月令主导，年/日/时次之。
 * 命理口径：月令权重最高（管月令旺衰）；日柱次之（管日主根基）；时柱再次（晚年）；年柱最弱（祖基）。
 */
const PILLAR_WEIGHTS = {
  year: 0.6,
  month: 1.0,
  day: 1.0,
  hour: 0.8,
};

/**
 * 统计五行力量。
 *
 * 加权策略：
 * - 天干各按柱位权重计
 * - 地支藏干按藏干权重 + 柱位权重 + （月支本气 ×1.8 得令）加成
 */
export function computeFiveElements(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
): FiveElementsResult {
  const scores: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const counts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  const list: { pillar: Pillar; weight: number }[] = [
    { pillar: pillars.year, weight: PILLAR_WEIGHTS.year },
    { pillar: pillars.month, weight: PILLAR_WEIGHTS.month },
    { pillar: pillars.day, weight: PILLAR_WEIGHTS.day },
  ];
  if (pillars.hour) list.push({ pillar: pillars.hour, weight: PILLAR_WEIGHTS.hour });

  const monthBranch = pillars.month.earthlyBranch as EarthlyBranch;

  for (const { pillar: p, weight: pw } of list) {
    if (!p) continue;
    // 天干
    const stemEl = STEM_ELEMENT[p.heavenlyStem as HeavenlyStem];
    scores[stemEl] += 1.0 * pw;
    counts[stemEl] += 1;

    // 地支藏干
    const branch = p.earthlyBranch as EarthlyBranch;
    const hidden = BRANCH_HIDDEN_STEMS[branch] ?? [];
    const isMonthBranch = branch === monthBranch;
    hidden.forEach((h, idx) => {
      const el = STEM_ELEMENT[h.stem];
      let w = h.weight * pw;
      // 月令本气得令加成
      if (isMonthBranch && idx === 0) {
        w *= MONTH_ORDER_BONUS;
      }
      scores[el] += w;
      counts[el] += w >= 0.5 ? 1 : 0;
    });
  }

  const dayMasterElement = STEM_ELEMENT[pillars.day.heavenlyStem as HeavenlyStem];

  const { strength, dayMasterScore } = judgeStrength(scores, dayMasterElement);
  const { favorable, unfavorable } = pickFavorable(dayMasterElement, strength);

  // 保留一位小数
  const roundedScores = { ...scores };
  for (const el of ALL_ELEMENTS) {
    roundedScores[el] = Math.round(scores[el] * 10) / 10;
  }

  // 五行由强到弱的排序
  const rankByScore = [...ALL_ELEMENTS].sort(
    (a, b) => roundedScores[b] - roundedScores[a],
  );

  // 完全缺失的五行（得分 ≤ 0.1）
  const missingElements = ALL_ELEMENTS.filter((el) => roundedScores[el] <= 0.1);

  return {
    counts,
    scores: roundedScores,
    dayMasterElement,
    dayMasterStrength: strength,
    dayMasterScore,
    favorable,
    unfavorable,
    rankByScore,
    missingElements,
  };
}

/**
 * 判断日主旺衰。
 *
 * 同党（生我 + 同我） vs 异党（克我 + 我克 + 我生）力量对比。
 */
export function judgeStrength(
  scores: Record<Element, number>,
  dayMasterElement: Element,
): { strength: FiveElementsResult['dayMasterStrength']; dayMasterScore: number } {
  const self = dayMasterElement;
  const resource = ELEMENT_GENERATED_BY[self];
  const output = ELEMENT_GENERATES[self];
  const wealth = ELEMENT_OVERCOMES[self];
  const officer = ELEMENT_OVERCOME_BY[self];

  const allies = scores[self] + scores[resource];
  const rivals = scores[output] + scores[wealth] + scores[officer];
  const total = allies + rivals;

  const ratio = total === 0 ? 0.5 : allies / total;
  const dayMasterScore = Math.round(ratio * 100);

  let strength: FiveElementsResult['dayMasterStrength'];
  if (ratio >= 0.56) {
    strength = 'strong';
  } else if (ratio <= 0.44) {
    strength = 'weak';
  } else {
    strength = 'balanced';
  }

  return { strength, dayMasterScore };
}

/**
 * 依据旺衰选取喜用神 / 忌神。
 *
 * - 身强：宜克泄耗（官杀、食伤、财），忌生扶（印、比劫）
 * - 身弱：宜生扶（印、比劫），忌克泄耗
 * - 均衡：以调候平衡为主，取相对弱的一方为喜
 */
export function pickFavorable(
  dayMasterElement: Element,
  strength: FiveElementsResult['dayMasterStrength'],
): { favorable: Element[]; unfavorable: Element[] } {
  const self = dayMasterElement;
  const resource = ELEMENT_GENERATED_BY[self];
  const output = ELEMENT_GENERATES[self];
  const wealth = ELEMENT_OVERCOMES[self];
  const officer = ELEMENT_OVERCOME_BY[self];

  if (strength === 'strong') {
    return {
      favorable: unique([officer, output, wealth]),
      unfavorable: unique([self, resource]),
    };
  }
  if (strength === 'weak') {
    return {
      favorable: unique([resource, self]),
      unfavorable: unique([officer, output, wealth]),
    };
  }
  // balanced：喜用取官杀与印（平衡调候），忌过旺的比劫
  return {
    favorable: unique([resource, officer]),
    unfavorable: unique([wealth]),
  };
}

function unique(arr: Element[]): Element[] {
  return [...new Set(arr)];
}
