import type { TenGod } from '../types/enums.js';
import {
  ELEMENT_GENERATED_BY,
  ELEMENT_GENERATES,
  ELEMENT_OVERCOME_BY,
  ELEMENT_OVERCOMES,
  STEM_ELEMENT,
  STEM_YINYANG,
  type HeavenlyStem,
} from './ganzhi.js';

/**
 * 计算某天干相对日主的十神。
 *
 * 规则：
 * - 同五行：同阴阳=比肩，异阴阳=劫财
 * - 我生者：同阴阳=食神，异阴阳=伤官
 * - 我克者：同阴阳=偏财，异阴阳=正财
 * - 克我者：同阴阳=七杀，异阴阳=正官
 * - 生我者：同阴阳=偏印，异阴阳=正印
 */
export function calcTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const dmElement = STEM_ELEMENT[dayMaster];
  const tElement = STEM_ELEMENT[target];
  const sameYinYang = STEM_YINYANG[dayMaster] === STEM_YINYANG[target];

  if (tElement === dmElement) {
    return sameYinYang ? '比肩' : '劫财';
  }
  if (ELEMENT_GENERATES[dmElement] === tElement) {
    // 日主生目标 => 食伤
    return sameYinYang ? '食神' : '伤官';
  }
  if (ELEMENT_OVERCOMES[dmElement] === tElement) {
    // 日主克目标 => 财
    return sameYinYang ? '偏财' : '正财';
  }
  if (ELEMENT_OVERCOME_BY[dmElement] === tElement) {
    // 目标克日主 => 官杀
    return sameYinYang ? '七杀' : '正官';
  }
  if (ELEMENT_GENERATED_BY[dmElement] === tElement) {
    // 目标生日主 => 印
    return sameYinYang ? '偏印' : '正印';
  }
  return '日主';
}
