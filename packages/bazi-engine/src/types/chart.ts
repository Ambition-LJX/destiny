import type {
  CalendarType,
  DayMasterStrength,
  Element,
  Gender,
  TenGod,
} from './enums.js';

/**
 * 排盘引擎输入。
 */
export interface BirthInput {
  /** 公历 / 农历 */
  calendar: CalendarType;
  year: number;
  month: number;
  day: number;
  /** 时（0-23），null 表示时辰未知 */
  hour: number | null;
  /** 分（0-59），null 表示未知 */
  minute: number | null;
  gender: Gender;
  /** 出生地经度，用于真太阳时校正（东经为正，西经为负） */
  longitude: number;
  /** 出生地纬度 */
  latitude: number;
  /** 是否启用真太阳时校正 */
  useTrueSolarTime: boolean;
  /** 农历输入时是否为闰月（仅 calendar==='lunar' 时有效） */
  isLeapMonth?: boolean;
}

/**
 * 单柱结构。
 */
export interface Pillar {
  /** 天干 */
  heavenlyStem: string;
  /** 地支 */
  earthlyBranch: string;
  /** 地支藏干 */
  hiddenStems: string[];
  /** 十神（天干相对日主） */
  tenGod: TenGod;
  /** 地支藏干对应的十神 */
  hiddenStemTenGods: TenGod[];
  /** 纳音 */
  naYin: string;
  /** 该柱天干对应五行 */
  element: Element;
  /** 该柱地支对应五行 */
  branchElement: Element;
}

/**
 * 五行统计与旺衰。
 */
export interface FiveElementsResult {
  /** 各五行计数（含天干、地支主气与藏干加权） */
  counts: Record<Element, number>;
  /** 各五行得分（加权后，保留一位小数） */
  scores: Record<Element, number>;
  /** 日主五行 */
  dayMasterElement: Element;
  /** 日主旺衰 */
  dayMasterStrength: DayMasterStrength;
  /** 日主力量得分（0-100 归一化） */
  dayMasterScore: number;
  /** 喜用神 */
  favorable: Element[];
  /** 忌神 */
  unfavorable: Element[];
}

/**
 * 大运一步。
 */
export interface LuckCycle {
  /** 序号，从 1 开始 */
  index: number;
  /** 起运虚岁 */
  startAge: number;
  /** 起运公历年份 */
  startYear: number;
  /** 结束公历年份 */
  endYear: number;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGod: TenGod;
  naYin: string;
  element: Element;
}

/**
 * 流年。
 */
export interface YearFortune {
  year: number;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGod: TenGod;
  naYin: string;
  element: Element;
  /** 该流年虚岁 */
  age: number;
}

/**
 * 起运信息。
 */
export interface LuckStartInfo {
  /** 是否顺排 */
  forward: boolean;
  /** 起运虚岁 */
  startAge: number;
  /** 起运公历年份 */
  startYear: number;
  /** 起运精确描述（几岁几月起运） */
  description: string;
}

/**
 * 完整排盘结果（喂给 AI 的结构化数据）。
 */
export interface BaziChart {
  /** 引擎版本，便于结果复现与回归 */
  engineVersion: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  fiveElements: FiveElementsResult;
  luckStart: LuckStartInfo;
  luckCycles: LuckCycle[];
  currentYear: YearFortune;
  shensha: string[];
  /** 生肖 */
  zodiac: string;
  /** 命宫（可选） */
  meta: {
    trueSolarTimeApplied: boolean;
    hourKnown: boolean;
    /** 校正后的公历时间（ISO 字符串，本地时区无关，仅记录钟表时刻） */
    solarDatetime: string;
    /** 校正的分钟数（真太阳时相对钟表时间的偏移） */
    trueSolarCorrectionMinutes: number;
    gender: Gender;
    longitude: number;
    latitude: number;
  };
}
