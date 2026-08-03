/**
 * 四柱之间的合、冲、刑、害、破关系，以及由此衍生的格局判定。
 *
 * 来源：传统命理常见口径。仅供文化娱乐参考。
 */

import type {
  EarthlyBranch,
  HeavenlyStem,
} from '../constants/ganzhi.js';
import type { PillarPosition } from '../types/enums.js';

/** 关系类型 */
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

/** 一组合/冲关系，positions 指涉及的柱位 */
export interface Relationship {
  kind: RelationshipKind;
  /** 涉及的柱位（按出现顺序） */
  positions: PillarPosition[];
  /** 涉及的干或支字符（按 positions 顺序） */
  chars: string[];
  /** 是否化（天干五合有"化"的概念，仅当天干合 + 月令得气时可成化） */
  transformed?: string;
  /** 备注 */
  note?: string;
}

const POSITIONS: PillarPosition[] = ['year', 'month', 'day', 'hour'];

/** 天干五合：甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火 */
const GAN_HE: Record<HeavenlyStem, { partner: HeavenlyStem; element: string } | null> = {
  甲: { partner: '己', element: '土' },
  乙: { partner: '庚', element: '金' },
  丙: { partner: '辛', element: '水' },
  丁: { partner: '壬', element: '木' },
  戊: { partner: '癸', element: '火' },
  己: { partner: '甲', element: '土' },
  庚: { partner: '乙', element: '金' },
  辛: { partner: '丙', element: '水' },
  壬: { partner: '丁', element: '木' },
  癸: { partner: '戊', element: '火' },
};

/** 天干相冲：甲庚冲、乙辛冲、丙壬冲、丁癸冲、戊己无冲（视为土对土） */
const GAN_CHONG: Record<HeavenlyStem, HeavenlyStem | null> = {
  甲: '庚',
  乙: '辛',
  丙: '壬',
  丁: '癸',
  戊: null,
  己: null,
  庚: '甲',
  辛: '乙',
  壬: '丙',
  癸: '丁',
};

/** 地支六合：子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合 */
const ZHI_LIU_HE: Record<EarthlyBranch, { partner: EarthlyBranch; element: string } | null> = {
  子: { partner: '丑', element: '土' },
  丑: { partner: '子', element: '土' },
  寅: { partner: '亥', element: '木' },
  亥: { partner: '寅', element: '木' },
  卯: { partner: '戌', element: '火' },
  戌: { partner: '卯', element: '火' },
  辰: { partner: '酉', element: '金' },
  酉: { partner: '辰', element: '金' },
  巳: { partner: '申', element: '水' },
  申: { partner: '巳', element: '水' },
  午: { partner: '未', element: '火' },
  未: { partner: '午', element: '火' },
};

/** 地支六冲：子午、丑未、寅申、卯酉、辰戌、巳亥 */
const ZHI_LIU_CHONG: Record<EarthlyBranch, EarthlyBranch | null> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
};

/** 地支六害：子未、丑午、寅巳、卯辰、申亥、酉戌 */
const ZHI_LIU_HAI: Record<EarthlyBranch, EarthlyBranch | null> = {
  子: '未',
  未: '子',
  丑: '午',
  午: '丑',
  寅: '巳',
  巳: '寅',
  卯: '辰',
  辰: '卯',
  申: '亥',
  亥: '申',
  酉: '戌',
  戌: '酉',
};

/** 地支破：子酉、丑辰、寅亥、卯午、巳申、未戌 */
const ZHI_PO: Record<EarthlyBranch, EarthlyBranch | null> = {
  子: '酉',
  酉: '子',
  丑: '辰',
  辰: '丑',
  寅: '亥',
  亥: '寅',
  卯: '午',
  午: '卯',
  巳: '申',
  申: '巳',
  未: '戌',
  戌: '未',
};

/** 地支三合局：申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金 */
const ZHI_SAN_HE: { branches: EarthlyBranch[]; element: string }[] = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
];

/** 地支三会局：亥子丑会北方水、寅卯辰会东方木、巳午未会南方火、申酉戌会西方金 */
const ZHI_SAN_HUI: { branches: EarthlyBranch[]; element: string; direction: string }[] = [
  { branches: ['亥', '子', '丑'], element: '水', direction: '北方' },
  { branches: ['寅', '卯', '辰'], element: '木', direction: '东方' },
  { branches: ['巳', '午', '未'], element: '火', direction: '南方' },
  { branches: ['申', '酉', '戌'], element: '金', direction: '西方' },
];

/** 地支三刑：寅巳申刑（无恩之刑）、丑戌未刑（恃势之刑）、子卯刑（无礼之刑） */
const ZHI_SAN_XING: { branches: EarthlyBranch[]; name: string; note: string }[] = [
  { branches: ['寅', '巳', '申'], name: '无恩之刑', note: '恩将仇报、是非口舌' },
  { branches: ['丑', '戌', '未'], name: '恃势之刑', note: '固执成见、亲缘不和' },
  { branches: ['子', '卯'], name: '无礼之刑', note: '失礼冲动、长辈失和' },
];

export interface PillarLike {
  heavenlyStem: string;
  earthlyBranch: string;
}

/**
 * 计算四柱之间的全部合冲刑害破关系。
 *
 * @param year 年柱
 * @param month 月柱
 * @param day 日柱
 * @param hour 时柱（时辰未知时传 null）
 */
export function computeRelationships(
  year: PillarLike,
  month: PillarLike,
  day: PillarLike,
  hour: PillarLike | null,
): Relationship[] {
  const pillars: { pos: PillarPosition; p: PillarLike }[] = [
    { pos: 'year', p: year },
    { pos: 'month', p: month },
    { pos: 'day', p: day },
  ];
  if (hour) pillars.push({ pos: 'hour', p: hour });

  const result: Relationship[] = [];

  // 1. 天干合 / 冲（只对比天干）
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      const sa = a.p.heavenlyStem as HeavenlyStem;
      const sb = b.p.heavenlyStem as HeavenlyStem;

      // 天干合
      const heInfo = GAN_HE[sa];
      if (heInfo && heInfo.partner === sb) {
        result.push({
          kind: '天干合',
          positions: [a.pos, b.pos],
          chars: [sa, sb],
          transformed: `化${heInfo.element}`,
          note: '合化需月令得气方为真化，否则为合绊',
        });
      }
      // 天干冲
      const chong = GAN_CHONG[sa];
      if (chong === sb) {
        result.push({
          kind: '天干冲',
          positions: [a.pos, b.pos],
          chars: [sa, sb],
          note: '天干相冲多主冲突、变动',
        });
      }
    }
  }

  // 2. 地支六合 / 六冲 / 六害 / 破（两两对比）
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      const za = a.p.earthlyBranch as EarthlyBranch;
      const zb = b.p.earthlyBranch as EarthlyBranch;

      const liuHe = ZHI_LIU_HE[za];
      if (liuHe && liuHe.partner === zb) {
        result.push({
          kind: '地支六合',
          positions: [a.pos, b.pos],
          chars: [za, zb],
          transformed: `化${liuHe.element}`,
          note: '合化需月令得气方为真化',
        });
      }

      const chong = ZHI_LIU_CHONG[za];
      if (chong === zb) {
        result.push({
          kind: '地支六冲',
          positions: [a.pos, b.pos],
          chars: [za, zb],
          note: '六冲主激烈变动、动象明显',
        });
      }

      const hai = ZHI_LIU_HAI[za];
      if (hai === zb) {
        result.push({
          kind: '地支六害',
          positions: [a.pos, b.pos],
          chars: [za, zb],
          note: '六害主暗耗、暗伤',
        });
      }

      const po = ZHI_PO[za];
      if (po === zb) {
        result.push({
          kind: '地支破',
          positions: [a.pos, b.pos],
          chars: [za, zb],
          note: '破主暗中损耗、关系破损',
        });
      }
    }
  }

  // 3. 地支三合（任意两两相邻取齐三个为半合，三个齐为全合）
  const allBranches = pillars.map((pl) => pl.p.earthlyBranch as EarthlyBranch);
  for (const sanHe of ZHI_SAN_HE) {
    const present = sanHe.branches.filter((b) => allBranches.includes(b));
    if (present.length === 3) {
      result.push({
        kind: '地支三合',
        positions: pillars
          .filter((pl) => sanHe.branches.includes(pl.p.earthlyBranch as EarthlyBranch))
          .map((pl) => pl.pos),
        chars: present,
        transformed: `化${sanHe.element}（全合）`,
      });
    } else if (present.length === 2) {
      const missing = sanHe.branches.find((b) => !allBranches.includes(b))!;
      result.push({
        kind: '地支三合',
        positions: pillars
          .filter((pl) => sanHe.branches.includes(pl.p.earthlyBranch as EarthlyBranch))
          .map((pl) => pl.pos),
        chars: present,
        note: `半合（缺${missing}）`,
      });
    }
  }

  // 4. 地支三会（顺四方位）
  for (const sanHui of ZHI_SAN_HUI) {
    const present = sanHui.branches.filter((b) => allBranches.includes(b));
    if (present.length >= 2) {
      result.push({
        kind: '地支三会',
        positions: pillars
          .filter((pl) => sanHui.branches.includes(pl.p.earthlyBranch as EarthlyBranch))
          .map((pl) => pl.pos),
        chars: present,
        transformed:
          present.length === 3
            ? `会${sanHui.direction}${sanHui.element}`
            : `半会（缺${sanHui.branches.find((b) => !allBranches.includes(b))}）`,
      });
    }
  }

  // 5. 地支三刑
  for (const sanXing of ZHI_SAN_XING) {
    const present = sanXing.branches.filter((b) => allBranches.includes(b));
    if (present.length === sanXing.branches.length) {
      result.push({
        kind: '地支三刑',
        positions: pillars
          .filter((pl) => sanXing.branches.includes(pl.p.earthlyBranch as EarthlyBranch))
          .map((pl) => pl.pos),
        chars: present,
        note: sanXing.name + '：' + sanXing.note,
      });
    }
  }

  return result;
}

/**
 * 将关系列表格式化为可读的中文文本，供 Prompt 注入使用。
 */
export function formatRelationships(rels: Relationship[]): string {
  if (!rels.length) return '命局无明显合冲刑害破';
  return rels
    .map((r, i) => {
      const idx = `${i + 1}.`;
      const head = `${idx} ${r.kind}：${r.positions.map((p, k) => `${p}[${r.chars[k]}]`).join(' ↔ ')}`;
      const tail = r.transformed ? ` → ${r.transformed}` : '';
      const note = r.note ? `（${r.note}）` : '';
      return `${head}${tail}${note}`;
    })
    .join('\n');
}

/** 暴露常量表供测试和上层使用 */
export const _INTERNAL = {
  GAN_HE,
  GAN_CHONG,
  ZHI_LIU_HE,
  ZHI_LIU_CHONG,
  ZHI_LIU_HAI,
  ZHI_PO,
  ZHI_SAN_HE,
  ZHI_SAN_HUI,
  ZHI_SAN_XING,
  POSITIONS,
};
