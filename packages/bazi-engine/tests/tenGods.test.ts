import { describe, it, expect } from 'vitest';
import { calcTenGod } from '../src/constants/tenGods.js';

/**
 * 十神计算测试。日主为庚（阳金）。
 */
describe('十神计算', () => {
  it('日主庚 → 各天干十神', () => {
    // 同五行金：庚(阳)=比肩，辛(阴)=劫财
    expect(calcTenGod('庚', '庚')).toBe('比肩');
    expect(calcTenGod('庚', '辛')).toBe('劫财');
    // 金生水（我生）：壬(阳)=食神，癸(阴)=伤官
    expect(calcTenGod('庚', '壬')).toBe('食神');
    expect(calcTenGod('庚', '癸')).toBe('伤官');
    // 金克木（我克，财）：甲(阳)=偏财，乙(阴)=正财
    expect(calcTenGod('庚', '甲')).toBe('偏财');
    expect(calcTenGod('庚', '乙')).toBe('正财');
    // 火克金（克我，官杀）：丙(阳)=七杀，丁(阴)=正官
    expect(calcTenGod('庚', '丙')).toBe('七杀');
    expect(calcTenGod('庚', '丁')).toBe('正官');
    // 土生金（生我，印）：戊(阳)=偏印，己(阴)=正印
    expect(calcTenGod('庚', '戊')).toBe('偏印');
    expect(calcTenGod('庚', '己')).toBe('正印');
  });

  it('日主乙（阴木）→ 十神阴阳判定', () => {
    expect(calcTenGod('乙', '乙')).toBe('比肩');
    expect(calcTenGod('乙', '甲')).toBe('劫财');
    // 木生火：丁(阴)=食神(同阴)，丙(阳)=伤官
    expect(calcTenGod('乙', '丁')).toBe('食神');
    expect(calcTenGod('乙', '丙')).toBe('伤官');
  });
});
