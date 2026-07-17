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
   * 主要拦截：疾病诊断、寿命断言、确定性投资指令等。
   */
  private readonly softenRules: { pattern: RegExp; replace: string }[] = [
    { pattern: /必定|一定会|注定|铁定|必然会/g, replace: '较有可能' },
    { pattern: /保证(能|会|可以)?/g, replace: '有机会' },
    { pattern: /百分之百|100%|包治|根治/g, replace: '较大概率' },
  ];

  /**
   * 命中即需要加风险提示的高危主题词。
   */
  private readonly riskyTopics = [
    '癌',
    '肿瘤',
    '绝症',
    '寿命',
    '死劫',
    '大限',
    '几年活',
    '离婚',
    '破产',
  ];

  /**
   * 对完整文本做后处理（用于非流式或流式结束后的整体校验）。
   */
  process(text: string): string {
    let out = text;
    for (const rule of this.softenRules) {
      out = out.replace(rule.pattern, rule.replace);
    }
    return out;
  }

  /**
   * 检测文本是否触及高危主题（用于日志或附加提示）。
   */
  hasRiskyTopic(text: string): boolean {
    return this.riskyTopics.some((w) => text.includes(w));
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
