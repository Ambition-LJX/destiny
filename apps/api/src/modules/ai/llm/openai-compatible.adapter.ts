import { Logger } from '@nestjs/common';
import type {
  ChatMessage,
  ChatOptions,
  LlmAdapter,
  LlmUsage,
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

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<{ content: string; usage?: LlmUsage }> {
    const res = await this.request(messages, options, false);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
      };
    };
    const content = json.choices?.[0]?.message?.content ?? '';
    const u = json.usage;
    const usage: LlmUsage | undefined = u
      ? {
          promptTokens: u.prompt_tokens ?? u.total_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
          promptCacheHitTokens: u.prompt_cache_hit_tokens,
          promptCacheMissTokens: u.prompt_cache_miss_tokens,
        }
      : undefined;
    return { content, usage };
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
    let produced = false;
    let reasoning = false;

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
            choices: { delta?: { content?: string; reasoning_content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta;
          // 推理模型（DeepSeek 等）会先输出 reasoning_content 思考过程，
          // 该内容不应展示给用户，仅用于判断是否发生了"只见思考、无正文"的情况。
          if (delta?.reasoning_content) reasoning = true;
          if (delta?.content) {
            produced = true;
            yield delta.content;
          }
        } catch {
          /* 忽略非 JSON 心跳行 */
        }
      }
    }

    // 模型仅在思考、没有产出任何正文（max_tokens 被思考过程耗尽）时，视为失败
    if (!produced && reasoning) {
      throw new Error('模型思考过程占用了全部 token 预算，未生成有效回答，请重试');
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(options?.idempotencyKey
            ? { 'Idempotency-Key': options.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          stream,
        }),
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.error('LLM 请求超时(60s)');
        throw new Error('LLM 请求超时，请稍后重试');
      }
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
