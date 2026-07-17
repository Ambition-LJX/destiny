import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
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
 */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * 流式生成单维度报告（SSE）。
   * GET 便于前端用 EventSource；鉴权仍走 JWT。
   */
  @Get('stream')
  async stream(
    @CurrentUser() user: AuthUser,
    @Query('chartId') chartId: string,
    @Query('dimension') dimension: ReportDimension,
    @Res() res: Response,
  ): Promise<void> {
    this.initSse(res);
    const dim = REPORT_DIMENSIONS.includes(dimension) ? dimension : 'personality';
    try {
      for await (const chunk of this.reports.generateDimensionStream(
        user.userId,
        chartId,
        dim,
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
  async generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateReportDto,
  ) {
    const items = await this.reports.generateAll(
      user.userId,
      dto.chartId,
      dto.dimensions,
    );
    return { disclaimer: DISCLAIMER, reports: items };
  }

  /**
   * 命盘问答（SSE 流式）。
   */
  @Post('ask')
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
