/**
 * 基础枚举类型：五行、阴阳、性别、历法等。
 */

/** 五行 */
export type Element = '木' | '火' | '土' | '金' | '水';

/** 阴阳 */
export type YinYang = '阳' | '阴';

/** 性别 */
export type Gender = 'male' | 'female';

/** 历法类型 */
export type CalendarType = 'solar' | 'lunar';

/** 日主旺衰 */
export type DayMasterStrength = 'strong' | 'weak' | 'balanced';

/** 十神名称 */
export type TenGod =
  | '比肩'
  | '劫财'
  | '食神'
  | '伤官'
  | '偏财'
  | '正财'
  | '七杀'
  | '正官'
  | '偏印'
  | '正印'
  | '日主';

/** 柱位 */
export type PillarPosition = 'year' | 'month' | 'day' | 'hour';
