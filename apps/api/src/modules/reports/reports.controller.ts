import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../common/dto/auth.types';
import { ReportsService } from './reports.service';
import { AskDto, GenerateReportDto } from './dto/report.dto';
import {
  DISCLAIMER,
  REPORT_DIMENSIONS,
  type ReportDimension,
} from '../ai/prompt/prompt.builder';
import type { ChatMessage } from '../ai/llm/llm.types';

/**
 * AI 解读与问答接口。
 *
 * 生成与问答默认走 SSE 流式返回，提升体验；
 * 同时提供非流式聚合接口用于一次性生成全部维度。
 * 成本统计等运营接口见 AdminModule（/admin/cost-stats）。
 */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * 查询当前用户额度（剩余免费次数等）。
   */
  @Get('quota')
  quota(@CurrentUser() user: AuthUser) {
    return this.reports.getQuota(user.userId);
  }

  /**
   * 单客成本模型：估算完整报告（全维度）+ 概览 + 问答的理论成本。
   * 供定价参考与前端展示，无需额外鉴权。
   */
  @Get('cost-per-package')
  costPerPackage() {
    return this.reports.costPerPackage();
  }

  /**
   * 流式生成单维度报告（SSE）。
   * GET 便于前端用 EventSource；鉴权仍走 JWT。
   */
  @Get('stream')
  @UseGuards(NotBannedGuard)
  async stream(
    @CurrentUser() user: AuthUser,
    @Query('chartId') chartId: string,
    @Query('dimension') dimension: ReportDimension,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    const dim = REPORT_DIMENSIONS.includes(dimension) ? dimension : 'personality';
    try {
      for await (const chunk of this.reports.generateDimensionStream(
        user.userId,
        chartId,
        dim,
        idempotencyKey,
      )) {
        this.sendSse(res, { delta: chunk });
      }
      this.sendSse(res, { done: true, disclaimer: DISCLAIMER });
    } catch (err) {
      this.sendSse(res, { error: (err as Error).message });
    } finally {
      res.end();
    }
  }

  /**
   * 流式生成命盘整体通俗解读（SSE）。
   * 用大白话把命盘的核心特点解释清楚，让不懂术语的用户也能看懂。
   */
  @Get('overview')
  @UseGuards(NotBannedGuard)
  async overview(
    @CurrentUser() user: AuthUser,
    @Query('chartId') chartId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    try {
      for await (const chunk of this.reports.generateOverviewStream(
        user.userId,
        chartId,
        idempotencyKey,
      )) {
        this.sendSse(res, { delta: chunk });
      }
      this.sendSse(res, { done: true, disclaimer: DISCLAIMER });
    } catch (err) {
      this.sendSse(res, { error: (err as Error).message });
    } finally {
      res.end();
    }
  }

  /**
   * 非流式生成全部（或指定）维度报告。
   */
  @Post('generate')
  @UseGuards(NotBannedGuard)
  async generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateReportDto,
  ) {
    const items = await this.reports.generateAll(
      user.userId,
      dto.chartId,
      dto.dimensions,
    );
    const hitCount = items.filter((i) => i.cached).length;
    return {
      disclaimer: DISCLAIMER,
      llmMeta: {
        provider: this.reports.providerAndModel().provider,
        model: this.reports.providerAndModel().model,
        cacheHits: hitCount,
        total: items.length,
      },
      reports: items.map((i) => ({
        dimension: i.dimension,
        label: i.label,
        content: i.content,
        cached: i.cached,
      })),
    };
  }

  /**
   * 命盘问答（SSE 流式）。
   */
  @Post('ask')
  @UseGuards(NotBannedGuard)
  async ask(
    @CurrentUser() user: AuthUser,
    @Body() dto: AskDto,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    const history: ChatMessage[] = (dto.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    }));
    try {
      for await (const chunk of this.reports.askStream(
        user.userId,
        dto.chartId,
        dto.question,
        history,
      )) {
        this.sendSse(res, { delta: chunk });
      }
      this.sendSse(res, { done: true, disclaimer: DISCLAIMER });
    } catch (err) {
      this.sendSse(res, { error: (err as Error).message });
    } finally {
      res.end();
    }
  }

  /**
   * 读取某排盘已生成的历史报告。
   */
  @Get(':chartId')
  list(@CurrentUser() user: AuthUser, @Param('chartId') chartId: string) {
    return this.reports.listReports(user.userId, chartId);
  }

  /**
   * 读取某排盘的问答历史（刷新页面后恢复记忆）。
   */
  @Get(':chartId/chat')
  chatList(@CurrentUser() user: AuthUser, @Param('chartId') chartId: string) {
    return this.reports.listChat(user.userId, chartId);
  }

  private initSse(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  }

  private sendSse(res: Response, payload: unknown): void {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
