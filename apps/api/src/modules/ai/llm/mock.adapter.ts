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

  private compose(messages: ChatMessage[]): string {
    const userMsg = [...messages].reverse().find((m) => m.role === 'user');
    const content = userMsg?.content ?? '';

    const dimMatch = content.match(/解读维度[:：]\s*(\S+)/);
    const dimension = dimMatch?.[1] ?? '综合';

    return [
      `【示例解读 · ${dimension}】`,
      '',
      '注意：当前为离线示例模式（未配置大模型 API Key），以下内容为占位示例，不代表真实解读。',
      '',
      '根据排盘引擎给出的结构化结果，可以从日主强弱、五行喜忌与十神配置三方面展开分析。',
      '本示例仅演示系统的排盘—解读链路，正式解读请在环境变量中配置有效的 LLM_API_KEY 后重试。',
      '',
      '温馨提示：命理内容仅供文化娱乐参考，不构成任何医疗、投资或法律建议。',
    ].join('\n');
  }
}