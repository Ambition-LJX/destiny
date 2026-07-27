import { Logger } from '@nestjs/common';
import type {
  ChatMessage,
  ChatOptions,
  LlmAdapter,
} from './llm.types';

/**
 * OpenAI 兼容适配器。
 *
 * 兼容所有遵循 OpenAI Chat Completions 协议的供应商
 * （OpenAI / DeepSeek / Moonshot / 通义千问兼容模式等），
 * 仅需切换 baseUrl 与 model。
 */
export class OpenAiCompatibleAdapter implements LlmAdapter {
  private readonly logger = new Logger(OpenAiCompatibleAdapter.name);

  constructor(
    public readonly provider: string,
    public readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const res = await this.request(messages, options, false);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? '';
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string> {
    const res = await this.request(messages, options, true);
    if (!res.body) {
      throw new Error('LLM 流式响应无 body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 按行解析，data: {...}
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload) as {
            choices: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* 忽略非 JSON 心跳行 */
        }
      }
    }
  }

  private async request(
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    stream: boolean,
  ): Promise<Response> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
    this.logger.debug(`LLM 请求: ${url} stream=${stream}`);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          stream,
        }),
      });
    } catch (err) {
      this.logger.error(`LLM 网络请求异常: ${(err as Error).message}`);
      throw new Error(`LLM 网络请求失败: ${(err as Error).message}`);
    }
    if (!res.ok) {
      let detail = '';
      try {
        const json = await res.json();
        detail = JSON.stringify(json).slice(0, 500);
      } catch {
        detail = await res.text().catch(() => '').then((t) => t.slice(0, 500));
      }
      this.logger.error(`LLM 请求失败 ${res.status}: ${detail}`);
      throw new Error(`LLM 请求失败(${res.status}): ${detail}`);
    }
    return res;
  }
}
