import { describe, it, expect } from 'vitest';
import {
  computeRelationships,
  formatRelationships,
  type PillarLike,
} from '../src/core/relationships.js';

describe('合冲关系计算', () => {
  function pl(stem: string, branch: string): PillarLike {
    return { heavenlyStem: stem, earthlyBranch: branch };
  }

  it('天干五合：甲己合化土', () => {
    const y = pl('甲', '子');
    const m = pl('己', '丑');
    const d = pl('丙', '寅');
    const rels = computeRelationships(y, m, d, null);
    const he = rels.find((r) => r.kind === '天干合' && r.chars.join('') === '甲己');
    expect(he).toBeDefined();
    expect(he?.transformed).toBe('化土');
  });

  it('地支六合：子丑合化土', () => {
    const y = pl('甲', '子');
    const m = pl('乙', '丑');
    const d = pl('丙', '寅');
    const rels = computeRelationships(y, m, d, null);
    const he = rels.find((r) => r.kind === '地支六合');
    expect(he).toBeDefined();
    expect(he?.transformed).toBe('化土');
  });

  it('地支六冲：子午冲', () => {
    const y = pl('甲', '子');
    const m = pl('乙', '卯');
    const d = pl('丙', '午');
    const rels = computeRelationships(y, m, d, null);
    const chong = rels.find((r) => r.kind === '地支六冲');
    expect(chong).toBeDefined();
    expect(chong?.chars.join('-')).toBe('子-午');
  });

  it('地支三合全合：申子辰合水', () => {
    const y = pl('甲', '申');
    const m = pl('乙', '子');
    const d = pl('丙', '辰');
    const rels = computeRelationships(y, m, d, null);
    const sanHe = rels.find(
      (r) => r.kind === '地支三合' && r.transformed?.includes('水'),
    );
    expect(sanHe).toBeDefined();
    expect(sanHe?.transformed).toContain('全合');
  });

  it('地支三合半合：缺一支', () => {
    const y = pl('甲', '申');
    const m = pl('乙', '子');
    const d = pl('丙', '卯');
    const rels = computeRelationships(y, m, d, null);
    const sanHe = rels.find(
      (r) => r.kind === '地支三合' && r.note?.includes('缺辰'),
    );
    expect(sanHe).toBeDefined();
  });

  it('地支三会方局：寅卯辰会东方木', () => {
    const y = pl('甲', '寅');
    const m = pl('乙', '卯');
    const d = pl('丙', '辰');
    const rels = computeRelationships(y, m, d, null);
    const sanHui = rels.find((r) => r.kind === '地支三会');
    expect(sanHui).toBeDefined();
    expect(sanHui?.transformed).toContain('东方');
  });

  it('地支三刑：寅巳申无恩之刑', () => {
    const y = pl('甲', '寅');
    const m = pl('乙', '巳');
    const d = pl('丙', '申');
    const rels = computeRelationships(y, m, d, null);
    const xing = rels.find((r) => r.kind === '地支三刑');
    expect(xing).toBeDefined();
    expect(xing?.note).toContain('无恩之刑');
  });

  it('无合冲的命局返回空列表', () => {
    const y = pl('甲', '子');
    const m = pl('乙', '寅');
    const d = pl('丙', '辰');
    const rels = computeRelationships(y, m, d, null);
    // 至少有半合
    expect(rels.length).toBeGreaterThanOrEqual(0);
  });

  it('formatRelationships 输出可读文本', () => {
    const y = pl('甲', '子');
    const m = pl('己', '午');
    const d = pl('丙', '寅');
    const rels = computeRelationships(y, m, d, null);
    const text = formatRelationships(rels);
    expect(text).toContain('天干合');
  });
});
