import { Injectable } from '@nestjs/common';

/**
 * 内容合规后处理过滤器。
 *
 * 作为 Prompt 约束之外的第二道防线：对生成文本做敏感断言检测与软化，
 * 并统一追加免责声明。
 */
@Injectable()
export class ContentFilterService {
  /**
   * 高风险断言关键词 → 软化替换。
   * 主要拦截：绝对化判断、保证性语言、百分之百类断言等。
   */
  private readonly softenRules: { pattern: RegExp; replace: string }[] = [
    { pattern: /必定|一定会|注定|铁定|必然会/g, replace: '较有可能' },
    { pattern: /保证(能|会|可以)/g, replace: '有机会$1' },
    { pattern: /百分之百|100%|包治|根治/g, replace: '较大概率' },
    { pattern: /必须(做|去|要|得)/g, replace: '建议(做|去|要|得)' },
    { pattern: /肯定(是|会|能)/g, replace: '倾向于(是|会|能)' },
  ];

  /**
   * 命中即需要加风险提示的高危主题词。
   * 按类别组织，便于后续精细化处理。
   */
  private readonly riskyTopics = {
    disease: ['癌', '癌症', '肿瘤', '绝症', '艾滋病', '白血病', '抑郁症', '精神病'],
    death: ['死劫', '大限', '必死', '绝命', '短命', '寿终', '猝死', '自杀', '跳楼'],
    finance: ['破产', '血本无归', '欠债千万', '倾家荡产'],
    relationship: ['离婚', '出轨', '家暴', '分居'],
    accident: ['血光', '车祸', '火灾', '溺水'],
  };

  /**
   * 命中后追加的提示语。
   */
  private readonly riskPrompts: Record<string, string> = {
    disease:
      '【风险提示】命理内容仅供文化娱乐参考，不可作为任何疾病诊断或医疗建议；如有健康疑虑请咨询专业医师。',
    death:
      '【风险提示】命理内容不预测生死寿夭，任何"寿元""死劫"之论均为娱乐参考，请勿据此做重大决策。',
    finance:
      '【风险提示】命理内容不构成任何投资/财务建议，涉及金钱决策请咨询专业人士。',
    relationship:
      '【风险提示】婚姻感情之事复杂多变，命理仅为参考，请以现实经营为准。',
    accident:
      '【风险提示】命理内容不预测具体灾祸，请勿据此产生恐慌。',
  };

  /**
   * 维度级风险开关：哪些维度的内容需要更严格审查。
   */
  private readonly dimensionStrictRules: Record<string, string[]> = {
    health: ['disease'],
    luck: ['death', 'accident', 'finance'],
    relationship: ['relationship'],
  };

  /**
   * 检测文本是否触及高危主题（用于日志或附加提示）。
   */
  hasRiskyTopic(text: string): { hit: boolean; categories: string[] } {
    const cats: string[] = [];
    for (const [cat, words] of Object.entries(this.riskyTopics)) {
      if (words.some((w) => text.includes(w))) cats.push(cat);
    }
    return { hit: cats.length > 0, categories: cats };
  }

  /**
   * 检测在指定维度下应触发的风险提示。
   */
  private dimensionRiskPrompts(dimension?: string): string {
    if (!dimension) return '';
    const strict = this.dimensionStrictRules[dimension] ?? [];
    const prompts: string[] = [];
    for (const cat of strict) {
      if (this.riskPrompts[cat]) prompts.push(this.riskPrompts[cat]);
    }
    return prompts.join('\n');
  }

  /**
   * 对完整文本做后处理（用于非流式或流式结束后的整体校验）。
   *
   * 1. 应用软化规则
   * 2. 检测高危主题，追加对应风险提示
   * 3. 若指定了维度，按维度严格规则追加风险提示
   */
  process(text: string, dimension?: string): string {
    let out = text;
    for (const rule of this.softenRules) {
      out = out.replace(rule.pattern, rule.replace);
    }

    const risk = this.hasRiskyTopic(out);
    const prompts: string[] = [];
    if (risk.hit) {
      for (const cat of risk.categories) {
        if (this.riskPrompts[cat]) prompts.push(this.riskPrompts[cat]);
      }
    }
    const dimPrompts = this.dimensionRiskPrompts(dimension);
    if (dimPrompts) prompts.push(dimPrompts);

    if (prompts.length > 0) {
      out = `${out}\n\n${prompts.join('\n\n')}`;
    }
    return out;
  }

  /**
   * 流式增量的轻量软化：仅做词级替换，避免跨块断词问题时保持简单。
   */
  processChunk(chunk: string): string {
    let out = chunk;
    for (const rule of this.softenRules) {
      out = out.replace(rule.pattern, rule.replace);
    }
    return out;
  }
}
