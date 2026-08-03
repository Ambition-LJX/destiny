/**
 * 前端与后端共享的数据结构类型（与引擎 BaziChart / API 响应对齐）。
 */

export type Element = '木' | '火' | '土' | '金' | '水';
export type Gender = 'male' | 'female';
export type CalendarType = 'solar' | 'lunar';
export type DayMasterStrength = 'strong' | 'weak' | 'balanced';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

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

export type RelationshipKind =
  | '天干合'
  | '天干冲'
  | '地支六合'
  | '地支六冲'
  | '地支三合'
  | '地支三会'
  | '地支六害'
  | '地支三刑'
  | '地支破';

export interface Relationship {
  kind: RelationshipKind;
  positions: ('year' | 'month' | 'day' | 'hour')[];
  chars: string[];
  transformed?: string;
  note?: string;
}

export interface ShenshaItem {
  name: string;
  position: 'year' | 'month' | 'day' | 'hour';
  source: string;
}

export interface Pattern {
  code: string;
  name: string;
  description: string;
  pillars: ('year' | 'month' | 'day' | 'hour')[];
}

export interface Pillar {
  heavenlyStem: string;
  earthlyBranch: string;
  hiddenStems: string[];
  tenGod: string;
  hiddenStemTenGods: string[];
  naYin: string;
  naYinElement: Element;
  element: Element;
  branchElement: Element;
  /** 该柱相对日主天干的十二长生阶段（含日柱） */
  twelveStage: TwelveStage;
}

export interface FiveElementsResult {
  counts: Record<Element, number>;
  scores: Record<Element, number>;
  dayMasterElement: Element;
  dayMasterStrength: DayMasterStrength;
  dayMasterScore: number;
  favorable: Element[];
  unfavorable: Element[];
  rankByScore: Element[];
  missingElements: Element[];
}

export interface LuckCycle {
  index: number;
  startAge: number;
  startYear: number;
  endYear: number;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGod: string;
  naYin: string;
  element: Element;
}

export interface YearFortune {
  year: number;
  heavenlyStem: string;
  earthlyBranch: string;
  tenGod: string;
  naYin: string;
  element: Element;
  age: number;
}

export interface BaziChart {
  engineVersion: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  fiveElements: FiveElementsResult;
  luckStart: {
    forward: boolean;
    startAge: number;
    startYear: number;
    description: string;
  };
  luckCycles: LuckCycle[];
  currentYear: YearFortune;
  shensha: string[];
  shenshaDetail: ShenshaItem[];
  relationships: Relationship[];
  patterns: Pattern[];
  dayXunKong: string[];
  mingGong?: string;
  zodiac: string;
  meta: {
    trueSolarTimeApplied: boolean;
    hourKnown: boolean;
    solarDatetime: string;
    trueSolarCorrectionMinutes: number;
    gender: Gender;
    longitude: number;
    latitude: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

export interface ProfileView {
  id: string;
  name: string;
  gender: Gender;
  calendar: CalendarType;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  longitude: number;
  latitude: number;
  hourKnown: boolean;
  useTrueSolarTime: boolean;
  isLeapMonth: boolean;
  createdAt: string;
}

export interface CreateProfilePayload {
  name: string;
  gender: Gender;
  calendar: CalendarType;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  longitude: number;
  latitude: number;
  useTrueSolarTime: boolean;
  isLeapMonth?: boolean;
}

export interface ChartResult {
  chartId: string;
  engineVersion: string;
  chart: BaziChart;
  cached: boolean;
}

export type ReportDimension =
  | 'personality'
  | 'career'
  | 'wealth'
  | 'relationship'
  | 'health'
  | 'family'
  | 'luck';

export interface StoredReport {
  id: string;
  dimension: string;
  content: string;
  modelVersion: string;
  createdAt: string;
}

/** 批量生成报告的单个结果项 */
export interface BatchReportItem {
  dimension: ReportDimension;
  label: string;
  content: string;
  cached?: boolean;
}
