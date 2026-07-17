import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { BaziChart } from '@app/bazi-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { LLM_ADAPTER, type LlmAdapter } from '../ai/llm/llm.types';
import { RagService } from '../ai/rag/rag.service';
import { ContentFilterService } from '../ai/filter/content-filter.service';
import {
  buildAskMessages,
  buildReportMessages,
  DISCLAIMER,
  REPORT_DIMENSIONS,
  type ReportDimension,
} from '../ai/prompt/prompt.builder';
import type { ChatMessage } from '../ai/llm/llm.types';

/**
 * AI 解读报告服务。
 *
 * 编排流程：读取排盘结果 → RAG 召回知识 → 构建 Prompt → 调用 LLM
 * → 内容过滤 → 落库。提供流式与非流式两种能力。
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
    private readonly filter: ContentFilterService,
    @Inject(LLM_ADAPTER) private readonly llm: LlmAdapter,
  ) {}

  /**
   * 读取排盘结果并校验归属。
   */
  private async loadChart(userId: string, chartId: string) {
    const chart = await this.prisma.chart.findUnique({
      where: { id: chartId },
      include: { profile: true },
    });
    if (!chart || chart.profile.userId !== userId || chart.profile.deletedAt) {
      throw new NotFoundException('排盘结果不存在或无权访问');
    }
    return chart;
  }

  /**
   * 生成单维度报告（流式）。逐段产出文本增量。
   */
  async *generateDimensionStream(
    userId: string,
    chartId: string,
    dimension: ReportDimension,
  ): AsyncIterable<string> {
    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    const knowledge = this.rag.retrieve(chart, dimension);
    const messages = buildReportMessages(chart, dimension, knowledge);

    let full = '';
    for await (const delta of this.llm.chatStream(messages, { temperature: 0.7 })) {
      const softened = this.filter.processChunk(delta);
      full += softened;
      yield softened;
    }

    // 落库（后处理整体软化后的最终文本）
    const finalText = this.filter.process(full);
    await this.persistReport(chartId, dimension, finalText);
  }

  /**
   * 生成单维度报告（非流式）。
   */
  async generateDimension(
    userId: string,
    chartId: string,
    dimension: ReportDimension,
  ): Promise<string> {
    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    const knowledge = this.rag.retrieve(chart, dimension);
    const messages = buildReportMessages(chart, dimension, knowledge);

    const raw = await this.llm.chat(messages, { temperature: 0.7 });
    const finalText = this.filter.process(raw);
    await this.persistReport(chartId, dimension, finalText);
    return finalText;
  }

  /**
   * 生成全部维度报告（非流式，返回维度 → 文本）。
   */
  async generateAll(
    userId: string,
    chartId: string,
    dimensions?: ReportDimension[],
  ): Promise<{ dimension: ReportDimension; label: string; content: string }[]> {
    const dims = dimensions?.length ? dimensions : [...REPORT_DIMENSIONS];
    const results: { dimension: ReportDimension; label: string; content: string }[] = [];
    for (const d of dims) {
      const content = await this.generateDimension(userId, chartId, d);
      results.push({ dimension: d, label: d, content });
    }
    return results;
  }

  /**
   * 命盘问答（流式）。
   */
  async *askStream(
    userId: string,
    chartId: string,
    question: string,
    history: ChatMessage[] = [],
  ): AsyncIterable<string> {
    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    const knowledge = this.rag.retrieve(chart, undefined, 4);
    const messages = buildAskMessages(chart, knowledge, question, history);

    for await (const delta of this.llm.chatStream(messages, { temperature: 0.8 })) {
      yield this.filter.processChunk(delta);
    }
  }

  /**
   * 读取某排盘已生成的历史报告。
   */
  async listReports(userId: string, chartId: string) {
    await this.loadChart(userId, chartId);
    const reports = await this.prisma.report.findMany({
      where: { chartId },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => ({
      id: r.id,
      dimension: r.dimension,
      content: r.content,
      modelVersion: r.modelVersion,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** 报告免责声明常量透出 */
  get disclaimer(): string {
    return DISCLAIMER;
  }

  private async persistReport(
    chartId: string,
    dimension: string,
    content: string,
  ): Promise<void> {
    try {
      await this.prisma.report.create({
        data: {
          chartId,
          dimension,
          content,
          modelVersion: `${this.llm.provider}:${this.llm.model}`,
        },
      });
    } catch (err) {
      this.logger.warn(`报告落库失败: ${(err as Error).message}`);
    }
  }
}
