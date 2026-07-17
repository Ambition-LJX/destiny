import type { Pillar } from '../types/chart.js';
import {
  BRANCH_ELEMENT,
  BRANCH_HIDDEN_STEMS,
  NAYIN_TABLE,
  STEM_ELEMENT,
  type EarthlyBranch,
  type HeavenlyStem,
} from '../constants/ganzhi.js';
import { calcTenGod } from '../constants/tenGods.js';

/**
 * 构建富化后的单柱信息。
 */
export function buildPillar(
  dayMaster: HeavenlyStem,
  stem: string,
  branch: string,
  isDayPillar = false,
): Pillar {
  const s = stem as HeavenlyStem;
  const b = branch as EarthlyBranch;
  const hidden = BRANCH_HIDDEN_STEMS[b] ?? [];

  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    hiddenStems: hidden.map((h) => h.stem),
    tenGod: isDayPillar ? '日主' : calcTenGod(dayMaster, s),
    hiddenStemTenGods: hidden.map((h) => calcTenGod(dayMaster, h.stem)),
    naYin: NAYIN_TABLE[`${stem}${branch}`] ?? '未知',
    element: STEM_ELEMENT[s],
    branchElement: BRANCH_ELEMENT[b],
  };
}
