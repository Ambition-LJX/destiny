import { Injectable } from '@nestjs/common';
import type { BaziChart, TenGod } from '@app/bazi-engine';
import {
  KNOWLEDGE_BASE,
  TEN_GOD_KNOWLEDGE,
  parseTags,
  type KnowledgeChunk,
} from './knowledge.data';

/**
 * 命理知识检索服务（轻量 RAG）。
 *
 * 采用基于盘面特征的标签召回 + 加权打分 + 维度过滤，
 * 无需外部向量库即可运行；后续可平滑替换为 pgvector / Qdrant 语义检索（保持相同接口）。
 */
@Injectable()
export class RagService {
  /**
   * 根据命盘与报告维度，召回相关知识片段。
   *
   * @param chart 排盘结构化结果
   * @param dimension 报告维度关键字（personality/career/...），可空
   * @param limit 最多返回条数
   */
  retrieve(
    chart: BaziChart,
    dimension?: string,
    limit = 6,
  ): KnowledgeChunk[] {
    const featureTags = this.extractFeatureTags(chart, dimension);

    const scored = KNOWLEDGE_BASE.map((chunk) => ({
      chunk,
      score: this.score(chunk, featureTags),
    }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // 保证十神相关知识优先注入
    const tenGodIds = this.collectTenGodKnowledgeIds(chart);
    const forced = KNOWLEDGE_BASE.filter((c) => tenGodIds.has(c.id));

    const merged: KnowledgeChunk[] = [];
    const seen = new Set<string>();
    for (const c of [...forced, ...scored.map((s) => s.chunk)]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      merged.push(c);
      if (merged.length >= limit) break;
    }
    return merged;
  }

  /**
   * 从命盘提取召回用特征标签（带互斥语义）。
   */
  private extractFeatureTags(chart: BaziChart, dimension?: string): Set<string> {
    const tags = new Set<string>();

    // 旺衰（互斥）
    if (chart.fiveElements.dayMasterStrength === 'strong') {
      tags.add('身强');
    } else if (chart.fiveElements.dayMasterStrength === 'weak') {
      tags.add('身弱');
    } else {
      tags.add('中和');
      tags.add('balanced');
    }
    tags.add('旺衰');
    tags.add('喜用神');
    tags.add('五行');

    // 五行缺失
    if (chart.fiveElements.missingElements.length > 0) {
      tags.add('缺失');
      tags.add('补救');
    }

    // 十神
    for (const tg of this.collectTenGods(chart)) {
      tags.add(tg);
    }

    // 神煞
    for (const s of chart.shenshaDetail) {
      tags.add(s.name);
    }

    // 合冲关系（标记出现的合冲类型）
    for (const r of chart.relationships) {
      tags.add(r.kind);
    }

    // 格局
    for (const p of chart.patterns) {
      tags.add(p.name);
      tags.add('格局');
    }

    // 旬空
    if (chart.dayXunKong.length > 0) {
      tags.add('旬空');
      tags.add('空亡');
    }

    // 维度
    if (dimension) {
      tags.add(dimension);
      const zhMap: Record<string, string> = {
        personality: '性格',
        career: '事业',
        wealth: '财运',
        relationship: '感情',
        health: '健康',
        family: '六亲',
        luck: '大运',
      };
      if (zhMap[dimension]) tags.add(zhMap[dimension]);
      if (dimension === 'luck') {
        tags.add('流年');
        tags.add('走势');
        tags.add('交脱');
      }
    }

    return tags;
  }

  /**
   * 加权打分：标签匹配时累加标签权重。
   * 互斥规则：旺衰知识（身强/身弱/中和）严格只命中一项，
   * 但因为我们已经在 extractFeatureTags 中只加入对应的那一项，所以无需额外处理。
   */
  private score(chunk: KnowledgeChunk, featureTags: Set<string>): number {
    let s = 0;
    for (const { tag, weight } of parseTags(chunk.tags)) {
      if (featureTags.has(tag)) s += weight;
    }
    return s;
  }

  private collectTenGods(chart: BaziChart): TenGod[] {
    const list: TenGod[] = [];
    const pillars = [
      chart.pillars.year,
      chart.pillars.month,
      chart.pillars.hour,
    ];
    for (const p of pillars) {
      if (p && p.tenGod !== '日主') list.push(p.tenGod);
    }
    return list;
  }

  private collectTenGodKnowledgeIds(chart: BaziChart): Set<string> {
    const ids = new Set<string>();
    for (const tg of this.collectTenGods(chart)) {
      const id = TEN_GOD_KNOWLEDGE[tg];
      if (id) ids.add(id);
    }
    return ids;
  }
}
