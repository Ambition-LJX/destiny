import type {
  CalendarType,
  DayMasterStrength,
  Element,
  Gender,
  PillarPosition,
  TenGod,
} from './enums.js';
import type { Relationship } from '../core/relationships.js';

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

/** 十二长生阶段（按日主在该支的状态） */
export type TwelveStage =
  | '长生'
  | '沐浴'
  | '冠带'
  | '临官'
  | '帝旺'
  | '衰'
  | '病'
  | '死'
  | '墓'
  | '绝'
  | '胎'
  | '养';

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
  /** 纳音（如 "海中金"） */
  naYin: string;
  /** 纳音五行（从纳音推导：金/木/水/火/土） */
  naYinElement: Element;
  /** 该柱天干对应五行 */
  element: Element;
  /** 该柱地支对应五行 */
  branchElement: Element;
  /** 该柱相对日主天干的十二长生阶段（仅在日柱之外的柱上算） */
  twelveStage?: TwelveStage;
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
  /** 五行由强到弱的排序（用于 AI 解读快速看到主次） */
  rankByScore: Element[];
  /** 完全缺失的五行（得分 ≤ 0.1） */
  missingElements: Element[];
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
 * 大运交接点（交脱年）。
 * 标记前后大运交接的年份，前一年+后一年作为缓冲（运势波动期）。
 */
export interface LuckTransition {
  /** 交接年（公历） */
  year: number;
  /** 进入的大运序号 */
  nextIndex: number;
  /** 进入大运的干支 */
  nextPillar: string;
  /** 退出大运的干支 */
  prevPillar: string;
  /** 交接缓冲说明（提示波动期） */
  note: string;
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
 * 神煞条目（带出处标注）。
 */
export interface ShenshaItem {
  /** 神煞名 */
  name: string;
  /** 出现在哪一柱 */
  position: PillarPosition;
  /** 出处：以哪个柱的支/干查到的（"年支" / "日支" / "日干"） */
  source: string;
}

/**
 * 命局结构（格局原型）。
 */
export interface Pattern {
  /** 格局代码 */
  code: string;
  /** 名称（如"建禄格"） */
  name: string;
  /** 简要描述，供 AI 解读参考 */
  description: string;
  /** 引动该格局的柱位 */
  pillars: ('year' | 'month' | 'day' | 'hour')[];
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
  /** 大运交接点（前后大运交脱年） */
  luckTransitions: LuckTransition[];
  currentYear: YearFortune;
  /**
   * 神煞（带出处）。键为神煞名，值为条目列表。
   * 老字段 `shensha: string[]` 仍保留以兼容，向后兼容写。
   */
  shensha: string[];
  shenshaDetail: ShenshaItem[];
  /** 合冲刑害破关系列表 */
  relationships: Relationship[];
  /** 命局结构（格局原型） */
  patterns: Pattern[];
  /** 生肖 */
  zodiac: string;
  /** 日柱旬空（空亡），如"戌亥" */
  dayXunKong: string[];
  /** 命宫（如"巳酉丑"） */
  mingGong?: string;
  /** 命局元数据 */
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
