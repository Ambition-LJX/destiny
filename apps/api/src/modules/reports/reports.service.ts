import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  STRUCTURED_OUTPUT_GUIDE,
  SYSTEM_CONSTRAINTS,
  estimateTokens,
  type ReportDimension,
} from '../ai/prompt/prompt.builder';
import type { ChatMessage } from '../ai/llm/llm.types';
import {
  estimateCost,
  estimateCostFromTokens,
  resolvePrice,
  roundCost,
} from './pricing';

/** 幂等缓存条目（短期内存级） */
interface IdempotEntry {
  content: string;
  usage?: LlmUsage;
  expiresAt: number;
}

/** 成本统计桶 */
export interface CostBucket {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCny: number;
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

  /** 当前额度周期键（形如 "2026-08"），用于识别月度重置 */
  private static monthKeyNow(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 获取（必要时创建）用户额度，并处理月度重置。
   * 免费额度按自然月重置，累计消耗（lifetimeTokens / lifetimeCost）不重置。
   */
  private async getOrCreateQuota(userId: string) {
    const monthKey = ReportsService.monthKeyNow();
    let quota = await this.prisma.userQuota.findUnique({ where: { userId } });
    if (!quota) {
      quota = await this.prisma.userQuota.create({
        data: { userId, monthKey },
      });
    } else if (quota.monthKey !== monthKey) {
      // 跨月：重置免费概览次数与已用计数，保持累计消耗
      quota = await this.prisma.userQuota.update({
        where: { userId },
        data: {
          usedOverviewCalls: 0,
          usedReportCalls: 0,
          usedAskCalls: 0,
          monthKey,
        },
      });
    }
    return quota;
  }

  /**
   * 解析当前套餐级别，并处理 pro 到期自动降级（惰性）。
   */
  private async resolvePlan(q: {
    plan: string;
    proExpiresAt: Date | null;
    userId: string;
  }): Promise<'free' | 'pro'> {
    if (q.plan === 'pro' && q.proExpiresAt && new Date(q.proExpiresAt) < new Date()) {
      await this.prisma.userQuota.update({
        where: { userId: q.userId },
        data: { plan: 'free' },
      });
      return 'free';
    }
    return q.plan === 'pro' ? 'pro' : 'free';
  }

  /**
   * 查询用户额度（含月度重置与到期降级），供控制层/前端展示。
   */
  async getQuota(userId: string) {
    const q = await this.getOrCreateQuota(userId);
    const plan = await this.resolvePlan(q);
    return {
      plan,
      proExpiresAt: q.proExpiresAt ? q.proExpiresAt.toISOString() : null,
      overview: { free: q.freeOverviewCalls, used: q.usedOverviewCalls },
      report: { used: q.usedReportCalls },
      ask: { used: q.usedAskCalls },
      lifetimeTokens: Number(q.lifetimeTokens),
      lifetimeCost: Number(q.lifetimeCost),
      monthKey: q.monthKey,
    };
  }

  /**
   * 单客成本模型：估算「一份完整报告（全部维度）+ 概览 + 问答」的理论成本（人民币）。
   *
   * 用真实提示词常量（系统约束、输出结构）计算输入 token 长度，配上可配置的
   * 排盘事实/知识召回/推理思考(reasoning)估算，得到每类调用的输入/输出 token 与成本。
   * 输出仅供定价参考，实际以 `UserQuota.lifetimeCost` 的累计为准。
   */
  async costPerPackage() {
    const model = this.llm.model;
    const pricing = resolvePrice(model);

    // DeepSeek 推理模型的 reasoning_content 会计入输出 token，此处取经验中值
    const reasoningTokens = 1300;
    // 排盘事实块（formatChartFacts）与知识召回块（formatKnowledge）的典型长度
    const chartFactsLength = 500;
    const knowledgePerChunkLength = 120;

    // 用真实常量计算固定输入长度
    const systemTokens = estimateTokens(SYSTEM_CONSTRAINTS);
    const structureTokens = estimateTokens(STRUCTURED_OUTPUT_GUIDE);
    // 按字符数估算 token（中文 1 字 ≈ 0.6 token，非中文 ≈ 0.3 token）
    const charTokens = (chars: number) => Math.ceil(chars * (0.6 + 0.3) / 2);

    const buildInput = (knowledgeChunks: number) =>
      systemTokens +
      structureTokens +
      charTokens(chartFactsLength) +
      charTokens(knowledgePerChunkLength * knowledgeChunks);

    // 各类调用的输入 token 估算
    const dimensionInput = buildInput(4);
    const overviewInput = buildInput(6);
    const askInput = buildInput(4);
    const askInputWithHistory = askInput + 2000; // 5 轮对话历史

    // 输出 token：正文（按目标字数估算）+ 推理思考
    const dimensionOutput = charTokens(450) + reasoningTokens;
    const overviewOutput = charTokens(700) + reasoningTokens;
    const askOutput = charTokens(400) + reasoningTokens;

    // 成本（人民币）：输入与输出占比不同，取典型输入占比做缓存命中加权，
    // 未命中区间按标准价计，更贴近首调场景
    const cost = (inTok: number, outTok: number) =>
      estimateCostFromTokens(model, inTok, outTok);

    const dimensions = REPORT_DIMENSIONS.map((key) => {
      const inputTokens = dimensionInput;
      const outputTokens = dimensionOutput;
      return {
        key,
        label: DIMENSION_LABELS[key],
        inputTokens,
        outputTokens,
        costCny: cost(inputTokens, outputTokens),
      };
    });

    const overview = {
      label: '整体概览',
      inputTokens: overviewInput,
      outputTokens: overviewOutput,
      costCny: cost(overviewInput, overviewOutput),
    };

    const ask = {
      firstRound: {
        label: '问答（首轮，无历史）',
        inputTokens: askInput,
        outputTokens: askOutput,
        costCny: cost(askInput, askOutput),
      },
      with5Rounds: {
        label: '问答（含 5 轮对话历史）',
        inputTokens: askInputWithHistory,
        outputTokens: askOutput,
        costCny: cost(askInputWithHistory, askOutput),
      },
    };

    // 完整套餐 = 7 维度 + 概览
    const pkgInput =
      dimensions.reduce((s, d) => s + d.inputTokens, 0) + overview.inputTokens;
    const pkgOutput =
      dimensions.reduce((s, d) => s + d.outputTokens, 0) + overview.outputTokens;
    const pkgCost = cost(pkgInput, pkgOutput);

    return {
      model,
      currency: 'CNY',
      pricing: {
        inputPerM: pricing.inputPerM,
        outputPerM: pricing.outputPerM,
        inputCacheHitPerM: pricing.inputCacheHitPerM,
      },
      assumptions: {
        reasoningTokens,
        chartFactsLength,
        knowledgePerChunkLength,
        inputCacheHitTokens: 0,
        note: '输入按缓存未命中标准价计（首个请求必未命中）；命中缓存后输入成本可低至 0.02-0.025 元/百万 token',
      },
      items: {
        overview,
        dimensions,
        ask,
      },
      package: {
        label: '完整套餐（7 维度 + 概览）',
        inputTokens: pkgInput,
        outputTokens: pkgOutput,
        costCny: pkgCost,
      },
      summary: {
        singleDimensionCostCny: cost(dimensionInput, dimensionOutput),
        overviewCostCny: overview.costCny,
        packageCostCny: pkgCost,
        askFirstRoundCostCny: ask.firstRound.costCny,
        askWithHistoryCostCny: ask.with5Rounds.costCny,
      },
    };
  }

  /**
   * 校验用户额度。
   * 套餐规则：
   * - pro：三种能力均不限（仅记录用量）
   * - free：仅可生成"整体概览"（免费次数 freeOverviewCalls），维度报告与问答需解锁
   */
  private async checkQuota(userId: string, kind: 'overview' | 'report' | 'ask') {
    const q = await this.getOrCreateQuota(userId);
    const plan = await this.resolvePlan(q);
    if (plan === 'pro') return;

    if (kind === 'overview') {
      if (q.usedOverviewCalls >= q.freeOverviewCalls) {
        throw new PayloadTooLargeException(
          '本月免费概览解读次数已用完，解锁完整版后可无限次使用',
        );
      }
      return;
    }
    // report / ask 仅 pro 可用
    throw new PayloadTooLargeException(
      kind === 'report'
        ? 'AI 完整解读需解锁后使用，解锁后全部维度报告无限次'
        : '命盘问答需解锁后使用，解锁后无限次问答',
    );
  }

  /**
   * 计量调用。
   * @param kind 概览(overview) / 维度报告(report) / 问答(ask)
   * @param tokens 本次调用 token 数（流式无 usage 时按输出长度估算）
   * @param costCny 本次调用估算成本（人民币）
   * @param calls 本次累加的调用次数（批量生成多维度时传实际次数，默认1）
   */
  private async consumeQuota(
    userId: string,
    kind: 'overview' | 'report' | 'ask',
    tokens = 0,
    costCny = 0,
    calls = 1,
  ) {
    const inc = Math.max(1, calls);
    await this.prisma.userQuota.update({
      where: { userId },
      data: {
        ...(kind === 'overview'
          ? { usedOverviewCalls: { increment: inc } }
          : kind === 'report'
            ? { usedReportCalls: { increment: inc } }
            : { usedAskCalls: { increment: inc } }),
        lifetimeTokens: { increment: tokens },
        lifetimeCost: { increment: costCny },
      },
    });
  }

  /**
   * 流式场景拿不到 usage 元数据，按输出长度估算 token 与成本（人民币）。
   * 输入 token 无法精确统计，此处仅计输出部分，作为成本下界参考。
   */
  private estimateStreamCost(text: string): { tokens: number; costCny: number } {
    const tokens = estimateTokens(text);
    const costCny = estimateCost(this.llm.model, {
      promptTokens: 0,
      completionTokens: tokens,
      totalTokens: tokens,
    });
    return { tokens, costCny };
  }

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

    await this.checkQuota(userId, 'report');
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
    const cost = this.estimateStreamCost(finalText);
    // 流式场景无法拿到真实 usage，按估算值落库，确保成本统计不为空
    const estimatedUsage: LlmUsage = {
      promptTokens: 0,
      completionTokens: cost.tokens,
      totalTokens: cost.tokens,
    };
    await this.persistReport(chartId, dimension, finalText, estimatedUsage);
    await this.consumeQuota(userId, 'report', cost.tokens, cost.costCny);
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
    await this.persistReport(chartId, dimension, finalText, usage);
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

    // 套餐生成整体计 1 次报告额度；有缓存维度时按实际新生成量计量
    await this.checkQuota(userId, 'report');

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

    // 仅对本次实际新生成的维度计量（缓存命中不计，避免重复扣费）
    const fresh = results.filter((r) => !r.cached);
    if (fresh.length > 0) {
      let tokens = 0;
      for (const r of fresh) {
        tokens += estimateTokens(r.content);
      }
      const costCny = estimateCost(this.llm.model, {
        promptTokens: 0,
        completionTokens: tokens,
        totalTokens: tokens,
      });
      await this.consumeQuota(userId, 'report', tokens, costCny, fresh.length);
    }
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

    await this.checkQuota(userId, 'overview');
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
    // 概览落库（dimension='overview'），避免刷新页面重复消耗免费次数
    const cost = this.estimateStreamCost(finalText);
    const estimatedUsage: LlmUsage = {
      promptTokens: 0,
      completionTokens: cost.tokens,
      totalTokens: cost.tokens,
    };
    await this.persistReport(chartId, 'overview', finalText, estimatedUsage);
    await this.consumeQuota(userId, 'overview', cost.tokens, cost.costCny);
  }

  /**
   * 命盘问答（流式）。
   * 问答历史持久化到 chat_messages 表，首次提问后即可在刷新页面时恢复记忆。
   */
  async *askStream(
    userId: string,
    chartId: string,
    question: string,
    history: ChatMessage[] = [],
  ): AsyncIterable<string> {
    await this.checkQuota(userId, 'ask');
    const chartRow = await this.loadChart(userId, chartId);
    const chart = chartRow.chartJson as unknown as BaziChart;

    // 持久化用户提问
    await this.saveChatMessage(chartId, 'user', question);

    // 从数据库读取之前的问答作为对话上下文（持久化记忆），回退到前端传入的历史
    const dbHistory = await this.loadChatHistory(chartId, 10);
    const context = dbHistory.length > 0 ? dbHistory : history;

    const knowledge = this.rag.retrieve(chart, undefined, 4);
    const messages = buildAskMessages(chart, knowledge, question, context);

    let full = '';
    for await (const delta of this.llm.chatStream(messages, {
      temperature: 0.8,
    })) {
      const softened = this.filter.processChunk(delta);
      full += softened;
      yield softened;
    }
    // 持久化助手回复
    await this.saveChatMessage(chartId, 'assistant', full);
    const cost = this.estimateStreamCost(full);
    await this.consumeQuota(userId, 'ask', cost.tokens, cost.costCny);
  }

  /**
   * 读取某排盘的全部问答历史（刷新页面后恢复记忆）。
   */
  async listChat(userId: string, chartId: string) {
    await this.loadChart(userId, chartId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { chartId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      role: r.role,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** 保存一条问答消息。 */
  private async saveChatMessage(
    chartId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<void> {
    if (!content) return;
    await this.prisma.chatMessage.create({
      data: { chartId, role, content },
    });
  }

  /** 读取最近 limit 条问答作为对话上下文（升序返回）。 */
  private async loadChatHistory(
    chartId: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { chartId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows
      .reverse()
      .map((r) => ({ role: r.role as ChatMessage['role'], content: r.content }));
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

  /**
   * 成本统计（用于运营看板）。
   *
   * 数据源说明：
   * - report 表：每条记录 = 1 次 LLM 调用（维度报告 + 概览），有时间戳可用于 today/month 过滤。
   *   历史流式记录 token 可能为 null，此处按内容长度估算。
   * - userQuota 表：累计 Token / 成本（每次 consumeQuota 实时累加，是最准确的总成本来源），
   *   以及问答调用次数（问答不创建 report 记录）。
   *
   * 逻辑约束：today ⊆ month ⊆ total，total 数值 ≥ today/month。
   */
  async costStats(): Promise<{
    today: CostBucket;
    month: CostBucket;
    total: CostBucket;
    byModel: Array<{ model: string } & CostBucket>;
    topUsers: Array<{
      userId: string;
      email: string;
      plan: string;
      lifetimeTokens: number;
      lifetimeCost: number;
      usedReportCalls: number;
      usedAskCalls: number;
    }>;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const rows = await this.prisma.report.findMany({
      select: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        modelVersion: true,
        createdAt: true,
        content: true,
      },
    });

    const empty = (): CostBucket => ({
      calls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costCny: 0,
    });

    /** 安全把 BigInt / Decimal / string / number 转为 number */
    const toNum = (v: unknown): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'string') return parseFloat(v) || 0;
      if (typeof v === 'object') {
        const d = v as { toNumber?: () => number; toString?: () => string };
        if (typeof d.toNumber === 'function') return d.toNumber();
        if (typeof d.toString === 'function') return parseFloat(d.toString()) || 0;
      }
      return Number(v) || 0;
    };

    /** 模型名归一化：空格/下划线→短横线，用于价格表匹配 */
    const normalizeModel = (raw: string): string =>
      raw.toLowerCase().replace(/[\s_]+/g, '-');

    // ---- 1. 从 report 表统计 today / month / reportTotal / byModel ----
    const todayB = empty();
    const monthB = empty();
    const reportTotal = empty();
    const byModel = new Map<string, CostBucket>();
    const modelDisplay = new Map<string, string>();

    for (const r of rows) {
      const modelRaw = r.modelVersion.split(':').pop() ?? r.modelVersion;
      const modelKey = normalizeModel(modelRaw);
      modelDisplay.set(modelKey, modelKey.replace(/-/g, ' '));

      let pt = r.promptTokens ?? 0;
      let ct = r.completionTokens ?? 0;
      let tt = r.totalTokens ?? 0;

      // token 为 0/null 时，按内容长度估算；估算仍为 0 时给保底 300 输出 token
      if (tt <= 0) {
        if (r.content) {
          const est = estimateTokens(r.content);
          if (est > 0) {
            ct = est;
            pt = Math.round(est * 0.6);
            tt = pt + ct;
          }
        }
        if (tt <= 0) {
          ct = 300;
          pt = 180;
          tt = pt + ct;
        }
      }

      const cost = estimateCostFromTokens(modelKey, pt, ct);
      const addTo = (b: CostBucket) => {
        b.calls += 1;
        b.promptTokens += pt;
        b.completionTokens += ct;
        b.totalTokens += tt;
        b.costCny += cost;
      };

      addTo(reportTotal);
      if (r.createdAt >= startOfMonth) addTo(monthB);
      if (r.createdAt >= startOfDay) addTo(todayB);

      const mb = byModel.get(modelKey) ?? empty();
      addTo(mb);
      byModel.set(modelKey, mb);
    }

    // ---- 2. 从 userQuota 获取真实累计 Token/成本 + 问答调用次数 ----
    const allQuotas = await this.prisma.userQuota.findMany({
      select: {
        lifetimeTokens: true,
        lifetimeCost: true,
        usedAskCalls: true,
      },
    });

    let quotaTokens = 0;
    let quotaCost = 0;
    let askCalls = 0;
    for (const q of allQuotas) {
      quotaTokens += toNum(q.lifetimeTokens);
      quotaCost += toNum(q.lifetimeCost);
      askCalls += q.usedAskCalls ?? 0;
    }

    // total 的调用数 = report 记录数（报告+概览）+ 问答调用数（不存 report）
    // total 的 token/成本 = max(report估算, quota真实累计)，取较大值确保不遗漏
    const totalB: CostBucket = {
      calls: reportTotal.calls + askCalls,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: Math.round(Math.max(quotaTokens, reportTotal.totalTokens)),
      costCny: roundCost(Math.max(quotaCost, reportTotal.costCny)),
    };

    // 逻辑保护：today/month 不应超过 total
    if (todayB.calls > totalB.calls) totalB.calls = todayB.calls;
    if (monthB.calls > totalB.calls) totalB.calls = monthB.calls;
    if (todayB.totalTokens > totalB.totalTokens) totalB.totalTokens = todayB.totalTokens;
    if (monthB.totalTokens > totalB.totalTokens) totalB.totalTokens = monthB.totalTokens;

    // ---- 3. Top users（按 lifetimeCost 降序，取前20）----
    const quotas = await this.prisma.userQuota.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { lifetimeCost: 'desc' },
      take: 20,
    });
    const topUsers = quotas.map((q) => ({
      userId: q.userId,
      email: q.user.email,
      plan: q.plan,
      lifetimeTokens: toNum(q.lifetimeTokens),
      lifetimeCost: roundCost(toNum(q.lifetimeCost)),
      usedReportCalls: q.usedReportCalls,
      usedAskCalls: q.usedAskCalls,
    }));

    const byModelArr = [...byModel.entries()]
      .map(([key, b]) => ({
        model: modelDisplay.get(key) ?? key,
        ...b,
        costCny: roundCost(b.costCny),
        promptTokens: Math.round(b.promptTokens),
        completionTokens: Math.round(b.completionTokens),
        totalTokens: Math.round(b.totalTokens),
      }))
      .sort((a, b) => b.costCny - a.costCny);

    return {
      today: { ...todayB, costCny: roundCost(todayB.costCny), totalTokens: Math.round(todayB.totalTokens), promptTokens: Math.round(todayB.promptTokens), completionTokens: Math.round(todayB.completionTokens) },
      month: { ...monthB, costCny: roundCost(monthB.costCny), totalTokens: Math.round(monthB.totalTokens), promptTokens: Math.round(monthB.promptTokens), completionTokens: Math.round(monthB.completionTokens) },
      total: totalB,
      byModel: byModelArr,
      topUsers,
    };
  }

  private async persistReport(
    chartId: string,
    dimension: string,
    content: string,
    usage?: LlmUsage,
  ): Promise<void> {
    try {
      await this.prisma.report.create({
        data: {
          chartId,
          dimension,
          content,
          modelVersion: `${this.llm.provider}:${this.llm.model}`,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
          totalTokens: usage?.totalTokens,
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