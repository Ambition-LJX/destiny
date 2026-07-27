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

export interface Pillar {
  heavenlyStem: string;
  earthlyBranch: string;
  hiddenStems: string[];
  tenGod: string;
  hiddenStemTenGods: string[];
  naYin: string;
  element: Element;
  branchElement: Element;
}

export interface FiveElementsResult {
  counts: Record<Element, number>;
  scores: Record<Element, number>;
  dayMasterElement: Element;
  dayMasterStrength: DayMasterStrength;
  dayMasterScore: number;
  favorable: Element[];
  unfavorable: Element[];
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
}
