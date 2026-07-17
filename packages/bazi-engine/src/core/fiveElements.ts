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
 * 月令对当令五行的加权（得令）。月支主气五行力量加成。
 */
const MONTH_ORDER_BONUS = 1.5;

/**
 * 统计五行力量。
 *
 * 加权策略：
 * - 天干各计 1.0
 * - 地支藏干按藏干权重计（本气/中气/余气）
 * - 月支（当令）主气额外加成
 */
export function computeFiveElements(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
): FiveElementsResult {
  const scores: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const counts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  const list: (Pillar | null)[] = [
    pillars.year,
    pillars.month,
    pillars.day,
    pillars.hour,
  ];

  const monthBranch = pillars.month.earthlyBranch as EarthlyBranch;

  for (const p of list) {
    if (!p) continue;
    // 天干
    const stemEl = STEM_ELEMENT[p.heavenlyStem as HeavenlyStem];
    scores[stemEl] += 1.0;
    counts[stemEl] += 1;

    // 地支藏干
    const branch = p.earthlyBranch as EarthlyBranch;
    const hidden = BRANCH_HIDDEN_STEMS[branch] ?? [];
    const isMonthBranch = branch === monthBranch;
    hidden.forEach((h, idx) => {
      const el = STEM_ELEMENT[h.stem];
      let w = h.weight;
      // 月令主气（本气）得令加成
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

  return {
    counts,
    scores: roundedScores,
    dayMasterElement,
    dayMasterStrength: strength,
    dayMasterScore,
    favorable,
    unfavorable,
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
  const resource = ELEMENT_GENERATED_BY[self]; // 生我（印）
  const output = ELEMENT_GENERATES[self]; // 我生（食伤）
  const wealth = ELEMENT_OVERCOMES[self]; // 我克（财）
  const officer = ELEMENT_OVERCOME_BY[self]; // 克我（官杀）

  const allies = scores[self] + scores[resource]; // 同党
  const rivals = scores[output] + scores[wealth] + scores[officer]; // 异党
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
