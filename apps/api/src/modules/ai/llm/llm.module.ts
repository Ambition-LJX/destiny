import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_ADAPTER, type LlmAdapter } from './llm.types';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import { MockAdapter } from './mock.adapter';

/**
 * LLM 适配层模块。
 *
 * 依据配置选择供应商：
 * - 配置了 LLM_API_KEY 时使用 OpenAI 兼容适配器；
 * - 否则回落到 Mock 适配器（离线可用，便于开发与演示）。
 */
@Module({
  providers: [
    {
      provide: LLM_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): LlmAdapter => {
        const logger = new Logger('LlmModule');
        const provider = config.get<string>('llm.provider') ?? 'openai';
        const apiKey = config.get<string>('llm.apiKey') ?? '';
        const baseUrl =
          config.get<string>('llm.baseUrl') ?? 'https://api.openai.com/v1';
        const model = config.get<string>('llm.model') ?? 'gpt-4o-mini';

        if (provider === 'mock' || !apiKey) {
          logger.warn('未配置 LLM_API_KEY，使用 Mock 适配器（仅供离线演示）');
          return new MockAdapter();
        }
        logger.log(`使用 LLM 适配器: ${provider} / ${model}`);
        return new OpenAiCompatibleAdapter(provider, model, apiKey, baseUrl);
      },
    },
  ],
  exports: [LLM_ADAPTER],
})
export class LlmModule {}
