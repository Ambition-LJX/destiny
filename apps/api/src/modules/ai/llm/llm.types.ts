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

  /** 流式生成，逐段产出文本增量 */
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string>;

  /** 非流式生成，返回完整文本 */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

/** LLM 适配器注入令牌 */
export const LLM_ADAPTER = Symbol('LLM_ADAPTER');
