import type { Element, YinYang } from '../types/enums.js';

/** 十天干 */
export const HEAVENLY_STEMS = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
] as const;

/** 十二地支 */
export const EARTHLY_BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

/** 天干五行 */
export const STEM_ELEMENT: Record<HeavenlyStem, Element> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

/** 天干阴阳 */
export const STEM_YINYANG: Record<HeavenlyStem, YinYang> = {
  甲: '阳',
  乙: '阴',
  丙: '阳',
  丁: '阴',
  戊: '阳',
  己: '阴',
  庚: '阳',
  辛: '阴',
  壬: '阳',
  癸: '阴',
};

/** 地支五行 */
export const BRANCH_ELEMENT: Record<EarthlyBranch, Element> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

/** 地支阴阳 */
export const BRANCH_YINYANG: Record<EarthlyBranch, YinYang> = {
  子: '阳',
  丑: '阴',
  寅: '阳',
  卯: '阴',
  辰: '阳',
  巳: '阴',
  午: '阳',
  未: '阴',
  申: '阳',
  酉: '阴',
  戌: '阳',
  亥: '阴',
};

/**
 * 地支藏干（按本气、中气、余气顺序）。
 * 权重用于五行力量统计。
 */
export const BRANCH_HIDDEN_STEMS: Record<
  EarthlyBranch,
  { stem: HeavenlyStem; weight: number }[]
> = {
  子: [{ stem: '癸', weight: 1.0 }],
  丑: [
    { stem: '己', weight: 0.6 },
    { stem: '癸', weight: 0.3 },
    { stem: '辛', weight: 0.1 },
  ],
  寅: [
    { stem: '甲', weight: 0.6 },
    { stem: '丙', weight: 0.3 },
    { stem: '戊', weight: 0.1 },
  ],
  卯: [{ stem: '乙', weight: 1.0 }],
  辰: [
    { stem: '戊', weight: 0.6 },
    { stem: '乙', weight: 0.3 },
    { stem: '癸', weight: 0.1 },
  ],
  巳: [
    { stem: '丙', weight: 0.6 },
    { stem: '庚', weight: 0.3 },
    { stem: '戊', weight: 0.1 },
  ],
  午: [
    { stem: '丁', weight: 0.7 },
    { stem: '己', weight: 0.3 },
  ],
  未: [
    { stem: '己', weight: 0.6 },
    { stem: '丁', weight: 0.3 },
    { stem: '乙', weight: 0.1 },
  ],
  申: [
    { stem: '庚', weight: 0.6 },
    { stem: '壬', weight: 0.3 },
    { stem: '戊', weight: 0.1 },
  ],
  酉: [{ stem: '辛', weight: 1.0 }],
  戌: [
    { stem: '戊', weight: 0.6 },
    { stem: '辛', weight: 0.3 },
    { stem: '丁', weight: 0.1 },
  ],
  亥: [
    { stem: '壬', weight: 0.7 },
    { stem: '甲', weight: 0.3 },
  ],
};

/** 生肖（对应地支） */
export const BRANCH_ZODIAC: Record<EarthlyBranch, string> = {
  子: '鼠',
  丑: '牛',
  寅: '虎',
  卯: '兔',
  辰: '龙',
  巳: '蛇',
  午: '马',
  未: '羊',
  申: '猴',
  酉: '鸡',
  戌: '狗',
  亥: '猪',
};

/**
 * 六十甲子纳音表。
 * 索引 = (天干序 * 6 + ...) 通过组合查询，这里用完整映射保证准确。
 */
export const NAYIN_TABLE: Record<string, string> = {
  甲子: '海中金',
  乙丑: '海中金',
  丙寅: '炉中火',
  丁卯: '炉中火',
  戊辰: '大林木',
  己巳: '大林木',
  庚午: '路旁土',
  辛未: '路旁土',
  壬申: '剑锋金',
  癸酉: '剑锋金',
  甲戌: '山头火',
  乙亥: '山头火',
  丙子: '涧下水',
  丁丑: '涧下水',
  戊寅: '城头土',
  己卯: '城头土',
  庚辰: '白蜡金',
  辛巳: '白蜡金',
  壬午: '杨柳木',
  癸未: '杨柳木',
  甲申: '泉中水',
  乙酉: '泉中水',
  丙戌: '屋上土',
  丁亥: '屋上土',
  戊子: '霹雳火',
  己丑: '霹雳火',
  庚寅: '松柏木',
  辛卯: '松柏木',
  壬辰: '长流水',
  癸巳: '长流水',
  甲午: '砂中金',
  乙未: '砂中金',
  丙申: '山下火',
  丁酉: '山下火',
  戊戌: '平地木',
  己亥: '平地木',
  庚子: '壁上土',
  辛丑: '壁上土',
  壬寅: '金箔金',
  癸卯: '金箔金',
  甲辰: '覆灯火',
  乙巳: '覆灯火',
  丙午: '天河水',
  丁未: '天河水',
  戊申: '大驿土',
  己酉: '大驿土',
  庚戌: '钗钏金',
  辛亥: '钗钏金',
  壬子: '桑柘木',
  癸丑: '桑柘木',
  甲寅: '大溪水',
  乙卯: '大溪水',
  丙辰: '沙中土',
  丁巳: '沙中土',
  戊午: '天上火',
  己未: '天上火',
  庚申: '石榴木',
  辛酉: '石榴木',
  壬戌: '大海水',
  癸亥: '大海水',
};

/**
 * 五行生克关系。
 */
/** 五行相生：key 生 value */
export const ELEMENT_GENERATES: Record<Element, Element> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

/** 五行相克：key 克 value */
export const ELEMENT_OVERCOMES: Record<Element, Element> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

/** 生我者（印）：value 生 key */
export const ELEMENT_GENERATED_BY: Record<Element, Element> = {
  火: '木',
  土: '火',
  金: '土',
  水: '金',
  木: '水',
};

/** 克我者（官杀）：value 克 key */
export const ELEMENT_OVERCOME_BY: Record<Element, Element> = {
  土: '木',
  水: '土',
  火: '水',
  金: '火',
  木: '金',
};

/** 时辰地支对应的起始小时（子时 23-1） */
export const HOUR_BRANCH_RANGES: { branch: EarthlyBranch; start: number; end: number }[] = [
  { branch: '子', start: 23, end: 1 },
  { branch: '丑', start: 1, end: 3 },
  { branch: '寅', start: 3, end: 5 },
  { branch: '卯', start: 5, end: 7 },
  { branch: '辰', start: 7, end: 9 },
  { branch: '巳', start: 9, end: 11 },
  { branch: '午', start: 11, end: 13 },
  { branch: '未', start: 13, end: 15 },
  { branch: '申', start: 15, end: 17 },
  { branch: '酉', start: 17, end: 19 },
  { branch: '戌', start: 19, end: 21 },
  { branch: '亥', start: 21, end: 23 },
];

/**
 * 阳干顺行、阴干逆行；起始支位因日干而异。
 * 数据来源：传统命理常见口径（阳干长生在亥/寅/寅/巳/申）。
 * 阴干逆行「长生」与同五行阳干同位（乙/丁/己/辛/癸 → 午/酉/午/寅/卯）。
 */
type TwelveStage =
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

const STAGES_ORDER: TwelveStage[] = [
  '长生',
  '沐浴',
  '冠带',
  '临官',
  '帝旺',
  '衰',
  '病',
  '死',
  '墓',
  '绝',
  '胎',
  '养',
];

/**
 * 阳干在子位起始、阴干在午位起始的偏移量；每个日干对应一个起始支索引（长生位）。
 * 业内通用：甲/丙/戊/庚/壬 长生在亥/寅/寅/巳/申；
 * 乙/丁/己/辛/癸 长生在午/酉/酉/寅/卯（与阳干同五行阴干逆行即"长生起步支"）。
 */
const STEM_LONG_LIFE_BRANCH_INDEX: Record<HeavenlyStem, number> = {
  // 子=0, 丑=1, 寅=2, ..., 亥=11
  甲: 11, // 亥
  乙: 6,  // 午
  丙: 2,  // 寅
  丁: 9,  // 酉
  戊: 2,  // 寅（与丙同）
  己: 9,  // 酉（与丁同）
  庚: 5,  // 巳
  辛: 2,  // 寅
  壬: 8,  // 申
  癸: 3,  // 卯
};

const BRANCH_INDEX: Record<EarthlyBranch, number> = {
  子: 0,
  丑: 1,
  寅: 2,
  卯: 3,
  辰: 4,
  巳: 5,
  午: 6,
  未: 7,
  申: 8,
  酉: 9,
  戌: 10,
  亥: 11,
};

/**
 * 计算某柱地支相对日干的十二长生。
 *
 * 阳干顺数（支位 +1），阴干逆数（支位 -1）。返回该柱所在长生阶段。
 */
export function twelveStageOf(
  dayMaster: HeavenlyStem,
  branch: EarthlyBranch,
): TwelveStage {
  const start = STEM_LONG_LIFE_BRANCH_INDEX[dayMaster];
  const target = BRANCH_INDEX[branch];
  const yang =
    dayMaster === '甲' ||
    dayMaster === '丙' ||
    dayMaster === '戊' ||
    dayMaster === '庚' ||
    dayMaster === '壬';
  // 阳干顺数，阴干逆数
  const rawOffset = yang
    ? (target - start + 12) % 12
    : (start - target + 12) % 12;
  return STAGES_ORDER[rawOffset];
}

/**
 * 纳音 → 五行映射。
 * 来源：传统命理口径，把纳音名称尾字映射到五行。
 */
const NAYIN_ELEMENT_MAP: Record<string, Element> = {
  金: '金',
  木: '木',
  水: '水',
  火: '火',
  土: '土',
};

/** 从纳音字符串（如"海中金"）推导五行。 */
export function naYinElement(naYin: string): Element {
  if (!naYin) return '土';
  // 取最后一个字
  const lastChar = naYin[naYin.length - 1];
  return NAYIN_ELEMENT_MAP[lastChar] ?? '土';
}
