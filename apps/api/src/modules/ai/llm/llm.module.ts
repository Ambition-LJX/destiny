import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_ADAPTER, type LlmAdapter } from './llm.types';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import { MockAdapter } from './mock.adapter';

/**
 * LLM 适配层模块。
 *
 * 依据配置选择供应商：
 * - `LLM_PROVIDER=mock` 时强制使用 Mock 适配器（即使有 API Key）；
 * - 未配置 `LLM_API_KEY` 时自动回落到 Mock 适配器；
 * - 否则使用 OpenAI 兼容适配器，baseUrl / model 可通过环境变量切换供应商。
 *
 * Mock 适配器会从结构化盘面上下文中抽取要点生成占位解读，
 * 保证前后端链路可跑通（前端 SSE 流式接收、断点续传、超时控制等）。
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
          logger.warn(
            `使用 Mock 适配器（LLM_PROVIDER=${provider}, apiKey=${apiKey ? '***' : '空'}）。输出为模板化占位解读，仅供离线演示与前端联调。`,
          );
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
