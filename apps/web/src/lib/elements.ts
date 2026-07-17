import type { Element, ReportDimension } from './types';

/**
 * 五行配色与展示辅助。
 */
export const ELEMENT_COLORS: Record<Element, string> = {
  木: '#3fa34d',
  火: '#e5484d',
  土: '#c8952f',
  金: '#d4af37',
  水: '#3b82f6',
};

/** 五行对应的浅色背景（用于标签底色） */
export const ELEMENT_BG: Record<Element, string> = {
  木: 'rgba(63, 163, 77, 0.12)',
  火: 'rgba(229, 72, 77, 0.12)',
  土: 'rgba(200, 149, 47, 0.12)',
  金: 'rgba(212, 175, 55, 0.14)',
  水: 'rgba(59, 130, 246, 0.12)',
};

export const ALL_ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

/** 天干五行映射，用于给柱头天干着色 */
export const STEM_ELEMENT: Record<string, Element> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

export const STRENGTH_LABEL: Record<string, string> = {
  strong: '身强',
  weak: '身弱',
  balanced: '中和',
};

/** 报告维度元信息 */
export const DIMENSIONS: { key: ReportDimension; label: string; icon: string }[] = [
  { key: 'personality', label: '性格特质', icon: '🧭' },
  { key: 'career', label: '事业', icon: '💼' },
  { key: 'wealth', label: '财运', icon: '💰' },
  { key: 'relationship', label: '感情婚姻', icon: '💞' },
  { key: 'health', label: '健康提示', icon: '🌿' },
  { key: 'family', label: '六亲关系', icon: '👪' },
  { key: 'luck', label: '大运流年', icon: '📈' },
];

export const DIMENSION_LABEL: Record<ReportDimension, string> = {
  personality: '性格特质',
  career: '事业',
  wealth: '财运',
  relationship: '感情婚姻',
  health: '健康提示',
  family: '六亲关系',
  luck: '大运流年走势',
};
