import { IsUUID } from 'class-validator';

/**
 * 排盘请求：指定档案，服务层解密出生信息后调用引擎。
 */
export class CalculateChartDto {
  @IsUUID('4', { message: 'profileId 必须为合法 UUID' })
  profileId!: string;
}
