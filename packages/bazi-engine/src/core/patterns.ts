import type { Element, DayMasterStrength } from '../types/enums.js';
import type { Pattern, Pillar } from '../types/chart.js';
import type { HeavenlyStem } from '../constants/ganzhi.js';

/**
 * 命局格局判定。
 *
 * 命中规则（简化版、可测试）：
 * - 建禄：月支与日干同五行（如甲日寅月、乙日卯月）
 * - 阳刃：月支与日干同五行且阴阳相同（如庚日酉月、壬日子月）
 * - 羊刃（亦称阳刃）：与阳刃同义
 * - 正官格：月支藏干含正官（如甲日酉月，辛金为正官）
 * - 七杀格：月支藏干含七杀
 * - 正印格：月支藏干含正印
 * - 偏印格：月支藏干含偏印
 * - 食神格：月支藏干含食神
 * - 伤官格：月支藏干含伤官
 * - 正财格：月支藏干含正财
 * - 偏财格：月支藏干含偏财
 * - 比肩格：月支藏干含比肩
 * - 劫财格：月支藏干含劫财
 * - 食神制杀：命中既有食神又有七杀
 * - 伤官配印：命中既有伤官又有正印
 * - 官印相生：命中既有正官又有正印
 * - 财官双美：命中既有正财又有正官
 * - 从弱（从财/从官杀）：身极弱，命局无印比，全为克泄耗
 * - 从强（从比/从印）：身极强，命局无财官食伤，全为生扶
 */

interface StemInfo {
  element: Element;
  yin: boolean;
}

const STEM_TABLE: Record<HeavenlyStem, StemInfo> = {
  甲: { element: '木', yin: false },
  乙: { element: '木', yin: true },
  丙: { element: '火', yin: false },
  丁: { element: '火', yin: true },
  戊: { element: '土', yin: false },
  己: { element: '土', yin: true },
  庚: { element: '金', yin: false },
  辛: { element: '金', yin: true },
  壬: { element: '水', yin: false },
  癸: { element: '水', yin: true },
};

const STEM_GROUP: Record<string, string> = {
  甲: '甲', 乙: '甲',
  丙: '丙', 丁: '丙',
  戊: '戊', 己: '戊',
  庚: '庚', 辛: '庚',
  壬: '壬', 癸: '壬',
};

/** 月支与日干的关系 → 格局名（用于建禄/阳刃快速判定） */
function monthBranchPattern(
  dayMaster: HeavenlyStem,
  monthBranch: string,
): Pattern | null {
  const info = STEM_TABLE[dayMaster];
  // 月支地支元素在 BRANCH_ELEMENT 已有，但本模块需要轻量引用；直接通过 STEM_TABLE 推断
  const BRANCH_EL: Record<string, Element> = {
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
  const meEl = info.element;
  const branchEl = BRANCH_EL[monthBranch];
  if (!branchEl || branchEl !== meEl) return null;

  // 同五行则可能是建禄或阳刃
  // 阳刃 = 月支与日干五行相同且阴阳相同（刚对刚）
  // 阳刃表：甲卯、丙巳、戊午、庚酉、壬子
  const YANG_REN: Record<HeavenlyStem, string> = {
    甲: '卯',
    丙: '巳',
    戊: '午',
    庚: '酉',
    壬: '子',
    乙: '寅', // 阴干阳刃对冲位置
    丁: '辰',
    己: '未',
    辛: '戌',
    癸: '丑',
  };
  if (YANG_REN[dayMaster] === monthBranch) {
    return {
      code: 'YANG_REN',
      name: '阳刃格',
      description:
        '月支与日干五行同且阴阳同（刚对刚），主魄力果决、锋芒外露，喜遇七杀/正官/食神制之则吉，无制则易冲动或健康耗损。',
      pillars: ['month'],
    };
  }

  // 建禄 = 月支与日干五行同但阴阳不同
  // 甲禄在寅、乙禄在卯、丙禄在巳、丁禄在午、戊禄在巳、己禄在午、庚禄在申、辛禄在酉、壬禄在亥、癸禄在子
  const LU: Record<HeavenlyStem, string> = {
    甲: '寅',
    乙: '卯',
    丙: '巳',
    丁: '午',
    戊: '巳',
    己: '午',
    庚: '申',
    辛: '酉',
    壬: '亥',
    癸: '子',
  };
  if (LU[dayMaster] === monthBranch) {
    return {
      code: 'JIAN_LU',
      name: '建禄格',
      description:
        '月支与日干同五行且阴阳异，身有根基、自我意识强。宜行官杀/食伤/财之运以激发格局，忌再行比劫印地。',
      pillars: ['month'],
    };
  }
  return null;
}

/** 月支藏干含某十神 → 形成对应格局 */
function monthBranchHiddenPattern(
  _dayMaster: HeavenlyStem,
  monthHiddenTenGods: string[],
): Pattern[] {
  const results: Pattern[] = [];
  const seen = new Set<string>();
  // 优先选藏干中最强的（本气）对应的十神做主格局
  const PRIORITY: Record<string, string> = {
    正官: 'ZHENG_GUAN',
    七杀: 'QI_SHA',
    正印: 'ZHENG_YIN',
    偏印: 'PIAN_YIN',
    食神: 'SHI_SHEN',
    伤官: 'SHANG_GUAN',
    正财: 'ZHENG_CAI',
    偏财: 'PIAN_CAI',
    比肩: 'BI_JIAN',
    劫财: 'JIE_CAI',
  };
  const DESC: Record<string, string> = {
    正官:
      '月令藏干含正官，正官格主贵气、责任与秩序；为人端正、重名誉，利公职/管理/稳定事业；女命正官亦主夫星。',
    七杀:
      '月令藏干含七杀，七杀格主威权、魄力与开创；有制则大将之才，无制则压力与冲突并存；宜食神制杀或印化杀。',
    正印:
      '月令藏干含正印，正印格主学识、庇护与母亲；为人仁厚好学、利学术文化、得长辈提携；身弱尤喜。',
    偏印:
      '月令藏干含偏印（枭神），偏印格主偏才、直觉与钻研；擅长冷门专业/技术，但与食神相冲需注意健康情绪。',
    食神:
      '月令藏干含食神，食神格主才华、口福与表达；温和乐观、有艺术或美食天赋；身强食神生财则福禄自来。',
    伤官:
      '月令藏干含伤官，伤官格主才华外露、创新与叛逆；聪明伶俐、利技艺创作，但需注意言语锋芒；若配印则清贵。',
    正财:
      '月令藏干含正财，正财格主稳健收入、责任与勤俭；踏实节俭、利稳定职业与长期积累；男命正财亦主妻缘。',
    偏财:
      '月令藏干含偏财，偏财格主流动之财、机遇与经营；慷慨大方、人缘佳、利经商投资；身强任财则财旺。',
    比肩:
      '月令藏干含比肩，比肩格主自我、同辈与竞争；独立自主、意志坚定、重朋友义气，财务上易因兄弟耗损。',
    劫财:
      '月令藏干含劫财，劫财格主竞争、破耗与冲动；行动力强、敢闯敢拼，但理财易冲动、易因合作投机破财。',
  };
  for (const tg of monthHiddenTenGods) {
    const code = PRIORITY[tg];
    if (!code || seen.has(code)) continue;
    seen.add(code);
    results.push({
      code,
      name: `${tg}格`,
      description: DESC[tg] ?? `${tg}格`,
      pillars: ['month'],
    });
  }
  return results;
}

/** 组合格局判定：同时存在多类十神时判定 */
function comboPatterns(pillars: {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
}): Pattern[] {
  const allStems = [
    pillars.year.tenGod,
    pillars.month.tenGod,
    pillars.day.tenGod,
    pillars.hour?.tenGod,
  ].filter((t) => t && t !== '日主') as string[];
  const set = new Set(allStems);
  const combos: { code: string; name: string; need: string[]; description: string }[] = [
    {
      code: 'SHI_ZHI_QI_SHA',
      name: '食神制杀',
      need: ['食神', '七杀'],
      description:
        '命中食神与七杀并见，以食神制杀者主有才干与魄力兼具，能在竞争性环境中脱颖而出；利军警、外科、竞技等领域。',
    },
    {
      code: 'SHANG_GUAN_PEI_YIN',
      name: '伤官配印',
      need: ['伤官', '正印'],
      description:
        '伤官配印主才华与学识并茂，能以理性驾驭创意；利文教、策划、研究等需要创新与逻辑兼顾的领域。',
    },
    {
      code: 'GUAN_YIN_XIANG_SHENG',
      name: '官印相生',
      need: ['正官', '正印'],
      description:
        '官生印、印护身，主贵气与学识并茂；为人端正稳重，能得贵人提拔、事业稳步上升。',
    },
    {
      code: 'CAI_GUAN_SHUANG_MEI',
      name: '财官双美',
      need: ['正财', '正官'],
      description:
        '命中财官并透且不相克，主名利双收；男命事业有成、家庭稳定；女命则夫星与财星皆佳、婚姻与物质兼美。',
    },
  ];
  const results: Pattern[] = [];
  for (const c of combos) {
    if (c.need.every((n) => set.has(n))) {
      results.push({
        code: c.code,
        name: c.name,
        description: c.description,
        pillars: ['year', 'month', 'day', 'hour'],
      });
    }
  }
  return results;
}

/**
 * 从弱/从强格局。
 * - 从弱（从财/从官杀）：身极弱且命局无印比，生扶缺位，宜顺从财官之势
 * - 从强（从比/从印）：身极强且命局无财官食伤，宜顺其旺势
 */
function congGe(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayMasterStrength: DayMasterStrength,
): Pattern[] {
  const tenGods = [
    pillars.year.tenGod,
    pillars.month.tenGod,
    pillars.hour?.tenGod,
  ].filter((t) => t && t !== '日主') as string[];

  if (dayMasterStrength === 'weak') {
    // 简化：分数 ≤ 30 时判定为从弱
    // 这里 strength === 'weak' 已经过五元素判定，但不算"极弱"
    // 进一步判断：命中无印、比劫即"无根"
    const hasResource = tenGods.some(
      (t) => t === '正印' || t === '偏印' || t === '比肩' || t === '劫财',
    );
    if (!hasResource) {
      return [
        {
          code: 'CONG_RUO',
          name: '从弱格',
          description:
            '命局无印比帮身，日主极弱而顺从财官之势。行运宜财官食伤，忌印比；逢扶身反为破格。',
          pillars: ['year', 'month', 'day', 'hour'],
        },
      ];
    }
  }
  if (dayMasterStrength === 'strong') {
    const hasConsume = tenGods.some(
      (t) => t === '正财' || t === '偏财' || t === '正官' || t === '七杀' || t === '食神' || t === '伤官',
    );
    if (!hasConsume) {
      return [
        {
          code: 'CONG_QIANG',
          name: '从强格',
          description:
            '命局无财官食伤消耗，日主极旺而顺其气势。行运宜比劫印地，忌财官食伤。',
          pillars: ['year', 'month', 'day', 'hour'],
        },
      ];
    }
  }
  return [];
}

/**
 * 主入口：计算命局格局。
 */
export function computePatterns(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayMaster: HeavenlyStem,
  dayMasterStrength: DayMasterStrength,
  favorable: Element[],
): Pattern[] {
  // 当前未将 favorable 用于额外判定（保留参数供未来扩展喜用神格局）
  void dayMaster;
  void favorable;
  const list: Pattern[] = [];

  // 1. 建禄 / 阳刃（按月支与日干）
  const monthBranch = pillars.month.earthlyBranch;
  const luOrRen = monthBranchPattern(dayMaster, monthBranch);
  if (luOrRen) list.push(luOrRen);

  // 2. 月支藏干十神对应的十神格（可能多条，但去重）
  const monthHiddenTG = pillars.month.hiddenStemTenGods ?? [];
  list.push(...monthBranchHiddenPattern(dayMaster, monthHiddenTG));

  // 3. 组合格局
  list.push(...comboPatterns(pillars));

  // 4. 从格
  list.push(...congGe(pillars, dayMasterStrength));

  // 去重（同 code 只保留首条）
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.code)) return false;
    seen.add(p.code);
    return true;
  });
}

// 内部使用：导出 STEM_GROUP 供其他模块使用
export { STEM_GROUP, STEM_TABLE };

