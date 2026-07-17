import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { REPORT_DIMENSIONS, type ReportDimension } from '../../ai/prompt/prompt.builder';

/**
 * 生成解读报告请求。
 */
export class GenerateReportDto {
  @IsUUID('4', { message: 'chartId 必须为合法 UUID' })
  chartId!: string;

  /** 要生成的维度；不传则生成全部维度 */
  @IsOptional()
  @IsArray()
  @IsIn(REPORT_DIMENSIONS as unknown as string[], { each: true })
  dimensions?: ReportDimension[];
}

/**
 * 单条历史消息。
 */
export class ChatHistoryItemDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

/**
 * 命盘问答请求。
 */
export class AskDto {
  @IsUUID('4', { message: 'chartId 必须为合法 UUID' })
  chartId!: string;

  @IsString()
  @MaxLength(500, { message: '问题最长 500 字' })
  question!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
