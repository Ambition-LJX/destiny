import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * 新建 / 更新命盘档案请求。
 * 出生时间在服务层组装后加密存储。
 */
export class CreateProfileDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsIn(['male', 'female'])
  gender!: 'male' | 'female';

  @IsIn(['solar', 'lunar'])
  calendar!: 'solar' | 'lunar';

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  /** 时（0-23），null 表示时辰未知 */
  @ValidateIf((o) => o.hour !== null)
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number | null;

  @ValidateIf((o) => o.minute !== null)
  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number | null;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsBoolean()
  useTrueSolarTime!: boolean;

  @IsOptional()
  @IsBoolean()
  isLeapMonth?: boolean;
}

/**
 * 档案返回视图（不含密文，出生信息已解密为结构化字段）。
 */
export interface ProfileView {
  id: string;
  name: string;
  gender: 'male' | 'female';
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  longitude: number;
  latitude: number;
  hourKnown: boolean;
  useTrueSolarTime: boolean;
  isLeapMonth: boolean;
  createdAt: string;
}
