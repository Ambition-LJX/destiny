import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { BaziChart } from '@app/bazi-engine';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LLM_ADAPTER,
  type LlmAdapter,
  type LlmUsage,
} from '../ai/llm/llm.types';
import { RagService } from '../ai/rag/rag.service';
import { ContentFilterService } from '../ai/filter/content-filter.service';
import {
  DIMENSION_LABELS,
  buildAskMessages,
  buildOverviewMessages,
  buildReportMessages,
  DISCLAIMER,
  REPORT_DIMENSIONS,
  type ReportDimension,
} from '../ai/prompt/prompt.builder';
import type { ChatMessage } from '../ai/llm/llm.types';

/** 幂等缓存条目（短期内存级） */
interface IdempotEntry {
  content: string;
  usage?: LlmUsage;
  expiresAt: number;
}

/**
 * AI 解读报告服务。
 *
 * 编排流程：读取排盘结果 → RAG 召回知识 → 构建 Prompt → 调用 LLM
 * → 内容过滤 → 落库。提供流式与非流式两种能力。
 *
 * 幂等策略：
 * - 客户端传入 `idempotencyKey`（或服务根据 chartId + dimension 生成）时，命中 60 秒内同 key 的请求直接返回。
 * - 同 key 调用携带到 LLM 适配层，便于支持 Idempotency-Key 头（如 OpenAI）。
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  /** 短期幂等缓存：避免用户重复点击"重新生成"时浪费配额 */
  private readonly idempCache = new Map<string, IdempotEntry>();
  private static readonly IDEMP_TTL_MS = 60_000;

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
   *
   * 流式场景无法返回 usage 元数据，仅在日志中记录；非流式场景下会一并返回。
   */
  async *generateDimensionStream(
    userId: string,
    chartId: string,
    dimension: ReportDimension,
    idempotencyKey?: string,
  ): AsyncIterable<string> {
    const key = idempotencyKey ?? `stream:${chartId}:${dimension}`;
    const cached = this.checkIdempotency(key);
    if (cached) {
      // 命中：直接按句重发（与流式观感一致）
      const segments = cached.match(/[^。！？\n]+[。！？\n]?/g) ?? [cached];
      for (const seg of segments) yield seg;
      return;
    }

    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    const knowledge = this.rag.retrieve(chart, dimension);
    const messages = buildReportMessages(chart, dimension, knowledge);

    const start = Date.now();
    let full = '';
    for await (const delta of this.llm.chatStream(messages, {
      temperature: 0.7,
      idempotencyKey: key,
    })) {
      const softened = this.filter.processChunk(delta);
      full += softened;
      yield softened;
    }
    this.logger.debug(
      `维度[${dimension}] 流式生成耗时=${Date.now() - start}ms 长度=${full.length}`,
    );

    // 落库（后处理整体软化后的最终文本）
    const finalText = this.filter.process(full, dimension);
    this.setIdempotency(key, finalText);
    await this.persistReport(chartId, dimension, finalText);
  }

  /**
   * 生成单维度报告（非流式）。返回完整文本 + Token 用量。
   */
  async generateDimension(
    userId: string,
    chartId: string,
    dimension: ReportDimension,
    idempotencyKey?: string,
  ): Promise<{ content: string; usage?: LlmUsage; cached: boolean }> {
    const key = idempotencyKey ?? `sync:${chartId}:${dimension}`;
    const cached = this.checkIdempotency(key);
    if (cached) {
      this.logger.debug(`命中幂等缓存: ${key}`);
      return { content: cached, cached: true };
    }

    this.logger.debug(`generateDimension: chartId=${chartId} dim=${dimension}`);
    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    const knowledge = this.rag.retrieve(chart, dimension);
    this.logger.debug(`RAG 召回 ${knowledge.length} 条知识`);

    const messages = buildReportMessages(chart, dimension, knowledge);

    const start = Date.now();
    const { content: raw, usage } = await this.llm.chat(messages, {
      temperature: 0.7,
      idempotencyKey: key,
    });
    this.logger.debug(
      `LLM 返回长度=${raw.length} latency=${Date.now() - start}ms usage=${JSON.stringify(usage)}`,
    );

    const finalText = this.filter.process(raw, dimension);
    this.setIdempotency(key, finalText, usage);
    await this.persistReport(chartId, dimension, finalText);
    this.logger.debug(`维度[${dimension}]落库完成`);
    return { content: finalText, usage, cached: false };
  }

  /**
   * 生成全部维度报告（非流式，返回维度 → 文本）。
   */
  async generateAll(
    userId: string,
    chartId: string,
    dimensions?: ReportDimension[],
  ): Promise<
    { dimension: ReportDimension; label: string; content: string; cached: boolean }[]
  > {
    const dims = dimensions?.length ? dimensions : [...REPORT_DIMENSIONS];
    this.logger.debug(
      `generateAll 开始: userId=${userId} chartId=${chartId}, 维度=${dims.join(',')}`,
    );

    const chartRow = await this.loadChart(userId, chartId);
    if (!chartRow) throw new NotFoundException('排盘结果不存在');

    const generateOne = async (
      d: ReportDimension,
    ): Promise<{ dimension: ReportDimension; label: string; content: string; cached: boolean }> => {
      const label = DIMENSION_LABELS[d];
      try {
        const { content, cached } = await Promise.race([
          this.generateDimension(userId, chartId, d),
          new Promise<{ content: string; cached: boolean }>((_, reject) =>
            setTimeout(
              () => reject(new Error(`「${label}」生成超时(60s)`)),
              60_000,
            ),
          ),
        ]);
        return { dimension: d, label, content, cached };
      } catch (err) {
        const cause = err instanceof Error ? err.message : String(err);
        this.logger.error(`维度[${label}]失败: ${cause}`);
        throw new Error(`「${label}」生成失败: ${cause}`);
      }
    };

    const results = await Promise.all(dims.map(generateOne));
    this.logger.debug(`generateAll 完成，共 ${results.length} 个报告`);
    return results;
  }

  /**
   * 命盘整体通俗解读（流式）。
   * 比单维度报告更口语化，目标是把专业术语翻译成大白话。
   */
  async *generateOverviewStream(
    userId: string,
    chartId: string,
    idempotencyKey?: string,
  ): AsyncIterable<string> {
    const key = idempotencyKey ?? `overview:${chartId}`;
    const cached = this.checkIdempotency(key);
    if (cached) {
      const segments = cached.match(/[^。！？\n]+[。！？\n]?/g) ?? [cached];
      for (const seg of segments) yield seg;
      return;
    }

    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    // 概览需要召回更多维度的知识
    const knowledge = this.rag.retrieve(chart, undefined, 6);
    const messages = buildOverviewMessages(chart, knowledge);

    const start = Date.now();
    let full = '';
    for await (const delta of this.llm.chatStream(messages, {
      temperature: 0.75,
      idempotencyKey: key,
    })) {
      const softened = this.filter.processChunk(delta);
      full += softened;
      yield softened;
    }
    this.logger.debug(
      `命盘概览 流式生成耗时=${Date.now() - start}ms 长度=${full.length}`,
    );

    const finalText = this.filter.process(full);
    this.setIdempotency(key, finalText);
    // 概览不单独落库，只做短期幂等缓存
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

    for await (const delta of this.llm.chatStream(messages, {
      temperature: 0.8,
    })) {
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

  /** 暴露当前适配器的 provider/model，用于 API 元数据 */
  providerAndModel(): { provider: string; model: string } {
    return { provider: this.llm.provider, model: this.llm.model };
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

  private checkIdempotency(key: string): string | undefined {
    const entry = this.idempCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.idempCache.delete(key);
      return undefined;
    }
    return entry.content;
  }

  private setIdempotency(key: string, content: string, usage?: LlmUsage): void {
    this.idempCache.set(key, {
      content,
      usage,
      expiresAt: Date.now() + ReportsService.IDEMP_TTL_MS,
    });
  }
}