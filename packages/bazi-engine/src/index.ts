/**
 * @app/bazi-engine
 *
 * 八字排盘引擎公共入口。
 * 全部为纯函数、无 I/O、确定性可复现。
 */

// 主入口
export { calculateBazi, ENGINE_VERSION } from './core/engine.js';

// 类型
export type {
  BirthInput,
  BaziChart,
  Pillar,
  TwelveStage,
  FiveElementsResult,
  LuckCycle,
  LuckTransition,
  YearFortune,
  LuckStartInfo,
  ShenshaItem,
  Pattern,
} from './types/chart.js';
export type {
  Element,
  YinYang,
  Gender,
  CalendarType,
  DayMasterStrength,
  TenGod,
  PillarPosition,
} from './types/enums.js';

// 常量（供上层 RAG / 报告层复用）
export {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  BRANCH_HIDDEN_STEMS,
  NAYIN_TABLE,
  BRANCH_ZODIAC,
  ELEMENT_GENERATES,
  ELEMENT_OVERCOMES,
  ELEMENT_GENERATED_BY,
  ELEMENT_OVERCOME_BY,
  twelveStageOf,
  naYinElement,
} from './constants/ganzhi.js';
export type { HeavenlyStem, EarthlyBranch } from './constants/ganzhi.js';
export { calcTenGod } from './constants/tenGods.js';

// 细粒度计算函数（便于测试与复用）
export {
  computeFiveElements,
  judgeStrength,
  pickFavorable,
} from './core/fiveElements.js';
export {
  isForward,
  computeLuckStart,
  computeLuckCycles,
  computeLuckTransitions,
  computeYearFortune,
  elementFavorability,
} from './core/luck.js';
export {
  computeSolarCorrection,
  equationOfTimeMinutes,
  longitudeCorrectionMinutes,
  dayOfYear,
  applyCorrection,
} from './core/solarTime.js';
export {
  normalizeToSolar,
  computeRawPillars,
  computeZodiac,
} from './core/calendar.js';
export type { NormalizedDateTime, RawPillars } from './core/calendar.js';
export { buildPillar } from './core/pillars.js';
export {
  computeShensha,
  computeXunKong,
  type ShenshaRawItem,
} from './core/shensha.js';
export {
  computeRelationships,
  formatRelationships,
  type Relationship,
  type RelationshipKind,
  type PillarLike,
} from './core/relationships.js';
export { computePatterns, STEM_TABLE, STEM_GROUP } from './core/patterns.js';
export { validateBirthInput, BaziInputError } from './core/validate.js';
