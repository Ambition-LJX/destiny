import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { RagService } from './rag/rag.service';
import { ContentFilterService } from './filter/content-filter.service';

/**
 * AI 能力模块：聚合 LLM 适配层、RAG 检索与内容过滤。
 * 供报告模块复用。
 */
@Module({
  imports: [LlmModule],
  providers: [RagService, ContentFilterService],
  exports: [LlmModule, RagService, ContentFilterService],
})
export class AiModule {}
