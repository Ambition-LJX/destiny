import type { RawPillars } from './calendar.js';
import type {
  HeavenlyStem,
  EarthlyBranch,
} from '../constants/ganzhi.js';
import type { PillarPosition } from '../types/enums.js';

/** 神煞原始条目（带出处） */
export interface ShenshaRawItem {
  name: string;
  position: PillarPosition;
  source: string;
}

/**
 * 神煞计算（常见神煞集合 + 旬空）。
 * 出处标注：每个神煞记录触发它的基准柱（"年支查" / "日支查" / "日干查"）。
 * 仅作参考性扩展，不参与旺衰与喜用神判定。
 */

/** 天乙贵人：以日干查对应地支（有两个） */
const TIANYI_GUIREN: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
  辛: ['寅', '午'],
};

/** 太极贵人：以日干查地支（昼夜分） */
const TAIJI: Record<HeavenlyStem, { day: EarthlyBranch[]; night: EarthlyBranch[] }> = {
  甲: { day: ['卯', '酉'], night: ['子', '午'] },
  乙: { day: ['辰', '戌'], night: ['丑', '未'] },
  丙: { day: ['寅', '亥'], night: ['卯', '酉'] },
  丁: { day: ['丑', '未'], night: ['辰', '戌'] },
  戊: { day: ['卯', '酉'], night: ['子', '午'] },
  己: { day: ['辰', '戌'], night: ['丑', '未'] },
  庚: { day: ['寅', '亥'], night: ['卯', '酉'] },
  辛: { day: ['丑', '未'], night: ['辰', '戌'] },
  壬: { day: ['子', '午'], night: ['卯', '酉'] },
  癸: { day: ['辰', '戌'], night: ['丑', '未'] },
};

/** 文昌贵人：以日干查地支 */
const WENCHANG: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
};

/** 桃花（咸池）：以年支或日支查 */
const TAOHUA: Record<EarthlyBranch, EarthlyBranch> = {
  申: '酉',
  子: '酉',
  辰: '酉',
  寅: '卯',
  午: '卯',
  戌: '卯',
  巳: '午',
  酉: '午',
  丑: '午',
  亥: '子',
  卯: '子',
  未: '子',
};

/** 驿马：以年支或日支查 */
const YIMA: Record<EarthlyBranch, EarthlyBranch> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
};

/** 华盖：以年支或日支查 */
const HUAGAI: Record<EarthlyBranch, EarthlyBranch> = {
  申: '辰',
  子: '辰',
  辰: '辰',
  寅: '戌',
  午: '戌',
  戌: '戌',
  巳: '丑',
  酉: '丑',
  丑: '丑',
  亥: '未',
  卯: '未',
  未: '未',
};

/** 将星（与华盖同位同查）：以年支或日支查 */
const JIANGXING = HUAGAI;

/** 金舆：以日干查（女命以日支查） */
const JINYU: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '辰',
  乙: '巳',
  丙: '未',
  丁: '申',
  戊: '未',
  己: '申',
  庚: '戌',
  辛: '亥',
  壬: '丑',
  癸: '寅',
};

/** 红艳：以日干查 */
const HONGYAN: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '午',
  乙: '申',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申',
};

/** 亡神：以年支查 */
const WANGSHEN: Record<EarthlyBranch, EarthlyBranch> = {
  申: '亥',
  子: '亥',
  辰: '亥',
  寅: '巳',
  午: '巳',
  戌: '巳',
  巳: '申',
  酉: '申',
  丑: '申',
  亥: '寅',
  卯: '寅',
  未: '寅',
};

/** 天德贵人：以月支查天干 + 地支（命中任何柱天干或地支所在柱即算） */
const TIANDE_STEM: Record<EarthlyBranch, string> = {
  寅: '丁',
  卯: '申',
  辰: '壬',
  巳: '辛',
  午: '亥',
  未: '甲',
  申: '癸',
  酉: '寅',
  戌: '丙',
  亥: '乙',
  子: '巳',
  丑: '庚',
};

const TIANDE_BRANCH: Record<EarthlyBranch, string> = {
  寅: '壬',
  卯: '癸',
  辰: '庚',
  巳: '乙',
  午: '丙',
  未: '辛',
  申: '戊',
  酉: '丁',
  戌: '己',
  亥: '甲',
  子: '庚',
  丑: '乙',
};

/** 月德贵人：以月支查天干 */
const YUEDE: Record<EarthlyBranch, string> = {
  寅: '丙',
  午: '丙',
  戌: '丙',
  申: '壬',
  子: '壬',
  辰: '壬',
  亥: '甲',
  卯: '甲',
  未: '甲',
  巳: '庚',
  酉: '庚',
  丑: '庚',
};

/**
 * 计算神煞列表（带出处）。
 */
export function computeShensha(
  pillars: RawPillars,
  _dayMaster: HeavenlyStem,
): ShenshaRawItem[] {
  const result: ShenshaRawItem[] = [];
  const dayStem = pillars.dayStem as HeavenlyStem;
  const yearBranch = pillars.yearBranch as EarthlyBranch;
  const dayBranch = pillars.dayBranch as EarthlyBranch;
  const monthBranch = pillars.monthBranch as EarthlyBranch;

  const allBranches: { pos: PillarPosition; b: EarthlyBranch }[] = [
    { pos: 'year', b: yearBranch },
    { pos: 'month', b: monthBranch },
    { pos: 'day', b: dayBranch },
  ];
  if (pillars.hourBranch) {
    allBranches.push({ pos: 'hour', b: pillars.hourBranch as EarthlyBranch });
  }
  const branchSet = new Set(allBranches.map((x) => x.b));

  function findPositionOf(target: EarthlyBranch): PillarPosition {
    const hit = allBranches.find((x) => x.b === target);
    return hit ? hit.pos : 'day';
  }

  function add(name: string, target: EarthlyBranch, source: string) {
    result.push({
      name,
      position: findPositionOf(target),
      source,
    });
  }

  // 天乙贵人（以日干查）
  for (const target of TIANYI_GUIREN[dayStem] ?? []) {
    if (branchSet.has(target)) add('天乙贵人', target, '日干查');
  }

  // 太极贵人（以日干查：区分昼夜）
  // 简化：白天的子时为子、丑时为丑…；这里采用"以月支分昼夜"的近似：
  // 白天(寅-申)、夜晚(酉-丑)。当前未取时辰判定昼夜，按白昼近似处理。
  const dayTimeTaiji = TAIJI[dayStem]?.day ?? [];
  for (const target of dayTimeTaiji) {
    if (branchSet.has(target)) add('太极贵人', target, '日干查（昼）');
  }

  // 文昌贵人（以日干查）
  const wc = WENCHANG[dayStem];
  if (branchSet.has(wc)) add('文昌贵人', wc, '日干查');

  // 桃花 / 驿马 / 华盖 / 将星 / 亡神（年支与日支各查一次）
  for (const base of [yearBranch, dayBranch]) {
    const sourceLabel = base === yearBranch ? '年支查' : '日支查';
    const t = TAOHUA[base];
    if (branchSet.has(t)) add('桃花', t, sourceLabel);
    const y = YIMA[base];
    if (branchSet.has(y)) add('驿马', y, sourceLabel);
    const h = HUAGAI[base];
    if (branchSet.has(h)) add('华盖', h, sourceLabel);
    const jx = JIANGXING[base];
    if (branchSet.has(jx)) add('将星', jx, sourceLabel);
    const ws = WANGSHEN[base];
    if (branchSet.has(ws)) add('亡神', ws, sourceLabel);
  }

  // 金舆（以日干查）
  const jy = JINYU[dayStem];
  if (branchSet.has(jy)) add('金舆', jy, '日干查');

  // 红艳（以日干查）
  const hy = HONGYAN[dayStem];
  if (branchSet.has(hy)) add('红艳', hy, '日干查');

  // 天德贵人（以月支查天干 + 地支，两条任一命中即算）
  const tdStem = TIANDE_STEM[monthBranch];
  if (tdStem) {
    const allStems: { pos: PillarPosition; s: string }[] = [
      { pos: 'year', s: pillars.yearStem },
      { pos: 'month', s: pillars.monthStem },
      { pos: 'day', s: pillars.dayStem },
    ];
    if (pillars.hourStem) {
      allStems.push({ pos: 'hour', s: pillars.hourStem });
    }
    const stemHit = allStems.find((x) => x.s === tdStem);
    if (stemHit) result.push({ name: '天德贵人', position: stemHit.pos, source: '月支查干' });
  }
  const tdBranch = TIANDE_BRANCH[monthBranch];
  if (tdBranch) {
    const allBranches: { pos: PillarPosition; b: EarthlyBranch }[] = [
      { pos: 'year', b: yearBranch },
      { pos: 'month', b: monthBranch },
      { pos: 'day', b: dayBranch },
    ];
    if (pillars.hourBranch) {
      allBranches.push({ pos: 'hour', b: pillars.hourBranch as EarthlyBranch });
    }
    const branchHit = allBranches.find((x) => x.b === tdBranch);
    if (branchHit) result.push({ name: '天德贵人', position: branchHit.pos, source: '月支查支' });
  }

  // 月德贵人（以月支查天干，命中任何柱天干即可）
  const ydStem = YUEDE[monthBranch];
  if (ydStem) {
    const allStems: { pos: PillarPosition; s: string }[] = [
      { pos: 'year', s: pillars.yearStem },
      { pos: 'month', s: pillars.monthStem },
      { pos: 'day', s: pillars.dayStem },
    ];
    if (pillars.hourStem) {
      allStems.push({ pos: 'hour', s: pillars.hourStem });
    }
    const stemHit = allStems.find((x) => x.s === ydStem);
    if (stemHit) result.push({ name: '月德贵人', position: stemHit.pos, source: '月支查干' });
  }

  return result;
}

/**
 * 计算日柱所在旬的空亡（旬空）。
 * 例如：甲子旬 空亡 戌亥
 */
export function computeXunKong(
  dayStem: HeavenlyStem,
  dayBranch: EarthlyBranch,
): string[] {
  // 旬起始：天干为甲或己
  const STEM_INDEX = '甲乙丙丁戊己庚辛壬癸';
  const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const stemIdx = STEM_INDEX.indexOf(dayStem);
  if (stemIdx < 0) return [];
  const zhiIdx = ZHI_LIST.indexOf(dayBranch);
  if (zhiIdx < 0) return [];
  // 找到该日干所属的旬首（甲或己 配 对应支）
  // 甲己 → 甲子旬；乙庚 → 甲寅旬；丙辛 → 甲辰旬；丁壬 → 甲午旬；戊癸 → 甲申旬
  const XUN_START: Record<string, [string, string]> = {
    甲: ['甲子', '戌亥'],
    己: ['甲子', '戌亥'],
    乙: ['甲寅', '子丑'],
    庚: ['甲寅', '子丑'],
    丙: ['甲辰', '寅卯'],
    辛: ['甲辰', '寅卯'],
    丁: ['甲午', '辰巳'],
    壬: ['甲午', '辰巳'],
    戊: ['甲申', '午未'],
    癸: ['甲申', '午未'],
  };
  const entry = XUN_START[dayStem];
  if (!entry) return [];
  return [...entry[1]];
}
