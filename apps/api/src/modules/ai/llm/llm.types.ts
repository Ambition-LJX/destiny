/**
 * LLM 适配层通用类型。
 * 通过统一接口屏蔽不同供应商差异，便于切换。
 */

/** 对话消息角色 */
export type ChatRole = 'system' | 'user' | 'assistant';

/** 单条对话消息 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** 生成参数 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** 当次调用的幂等键（用于去重与可观测性） */
  idempotencyKey?: string;
}

/** Token 用量与响应元数据（仅当适配器支持时填充） */
export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** 输入中命中 prompt 缓存的 token 数（DeepSeek 等返回 prompt_cache_hit_tokens） */
  promptCacheHitTokens?: number;
  /** 输入中未命中缓存的 token 数（DeepSeek 等返回 prompt_cache_miss_tokens） */
  promptCacheMissTokens?: number;
}

/** 调用元数据：耗时、是否命中缓存、是否使用 mock 等 */
export interface LlmCallMeta {
  /** 本次调用是否命中缓存（来自 chart/report 缓存层） */
  cached: boolean;
  /** 调用耗时（毫秒） */
  latencyMs?: number;
  /** 是否使用 mock 适配器 */
  mock: boolean;
  /** 适配器 provider */
  provider: string;
  /** 模型标识 */
  model: string;
  /** Token 用量（部分适配器可能无法统计） */
  usage?: LlmUsage;
}

/**
 * LLM 适配器接口。
 * 所有供应商实现必须提供流式与非流式两种能力。
 */
export interface LlmAdapter {
  /** 供应商标识 */
  readonly provider: string;
  /** 当前模型版本标识（用于记录 model_version） */
  readonly model: string;
  /** 是否已正确配置（有 API Key） */
  readonly configured: boolean;

  /** 流式生成，逐段产出文本增量（结束时不会带 token 元数据） */
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string>;

  /** 非流式生成，返回完整文本（带 token 元数据） */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<{
    content: string;
    usage?: LlmUsage;
  }>;
}

/** LLM 适配器注入令牌 */
export const LLM_ADAPTER = Symbol('LLM_ADAPTER');