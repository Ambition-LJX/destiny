import type {
  ChatMessage,
  ChatOptions,
  LlmAdapter,
  LlmUsage,
} from './llm.types';

/** 估算中文文本的 token 数（粗略：1 字 ≈ 1.5 token） */
function estimateTokens(text: string): number {
  return Math.ceil(text.length * 1.5);
}

/**
 * 离线 Mock 适配器。
 *
 * 未配置 LLM_API_KEY 时启用，用于本地开发与演示。
 * 从传入的结构化盘面上下文中提取要点，生成模板化的占位解读，
 * 保证前后端链路可跑通，且明确标注为"示例内容"。
 */
export class MockAdapter implements LlmAdapter {
  readonly provider = 'mock';
  readonly model = 'mock-explainer';
  readonly configured = true;

  async chat(
    messages: ChatMessage[],
    _options?: ChatOptions,
  ): Promise<{ content: string; usage?: LlmUsage }> {
    const content = this.compose(messages);
    const promptTokens = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );
    const usage: LlmUsage = {
      promptTokens,
      completionTokens: estimateTokens(content),
      totalTokens: promptTokens + estimateTokens(content),
    };
    return { content, usage };
  }

  async *chatStream(
    messages: ChatMessage[],
    _options?: ChatOptions,
  ): AsyncIterable<string> {
    const text = this.compose(messages);
    const segments = text.match(/[^。！？\n]+[。！？\n]?/g) ?? [text];
    for (const seg of segments) {
      yield seg;
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  /**
   * 离线示例文案。
   *
   * 结构与真实 LLM 严格保持一致（一句话结论/核心解读/关键要点/建议），
   * 让未配置 API Key 的用户也能预览到正式的排版效果，而不是一段孤立提示语。
   */
  private compose(messages: ChatMessage[]): string {
    const userMsg = [...messages].reverse().find((m) => m.role === 'user');
    const content = userMsg?.content ?? '';

    const dimMatch = content.match(/【([^】]+)】这一个维度/) ?? content.match(/解读维度[:：]\s*(\S+)/);
    const dimension = dimMatch?.[1] ?? '综合';

    return [
      '## 一句话结论',
      `【离线示例】未配置大模型 API Key，以下为「${dimension}」维度的占位示例内容，不代表真实解读。`,
      '',
      '## 核心解读',
      '当前系统运行在离线示例模式下，排盘引擎已经给出真实的四柱、五行、十神与合冲等结构化结果，但本段解读文本为固定占位文案，并非基于该盘面生成的真实分析。',
      '',
      '正式解读会结合日主旺衰、五行喜用神、合冲关系、命局格局与神煞展开详细说明，并给出可执行的正向建议。若需查看真实效果，请在环境变量中配置有效的 LLM_API_KEY 后重启 API 服务。',
      '',
      '## 关键要点',
      '- 排盘计算真实有效，本段解读文本为离线占位内容',
      '- 配置 LLM_API_KEY 后即可获得基于真实盘面的 AI 解读',
      '- 命理内容仅供文化娱乐参考，不构成专业建议',
      '',
      '## 建议',
      '- 如需体验真实解读效果，请参考部署文档配置大模型接入信息',
      '- 重要人生决策请以现实情况为准，理性看待命理内容',
    ].join('\n');
  }
}