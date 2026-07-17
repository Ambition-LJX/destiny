import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateProfileDto, ProfileView } from './dto/profile.dto';

/**
 * 出生信息明文结构（加密前 / 解密后）。
 */
export interface BirthPayload {
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  isLeapMonth: boolean;
}

/**
 * 命盘档案服务：出生信息加密存储、档案级权限校验、软删除。
 */
@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<ProfileView> {
    const hourKnown = dto.hour !== null && dto.hour !== undefined;
    const birth: BirthPayload = {
      calendar: dto.calendar,
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: hourKnown ? dto.hour : null,
      minute: hourKnown ? (dto.minute ?? 0) : null,
      isLeapMonth: dto.isLeapMonth ?? false,
    };
    const enc = this.crypto.encrypt(JSON.stringify(birth));

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        name: dto.name,
        gender: dto.gender,
        birthCalendar: dto.calendar,
        birthDatetimeEnc: enc,
        longitude: dto.longitude,
        latitude: dto.latitude,
        hourKnown,
        useTrueSolarTime: dto.useTrueSolarTime,
        isLeapMonth: dto.isLeapMonth ?? false,
      },
    });

    return this.toView(profile);
  }

  async list(userId: string): Promise<ProfileView[]> {
    const profiles = await this.prisma.profile.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return profiles.map((p) => this.toView(p));
  }

  async getOwnedOrThrow(userId: string, profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });
    if (!profile || profile.deletedAt) {
      throw new NotFoundException('档案不存在');
    }
    if (profile.userId !== userId) {
      throw new ForbiddenException('无权访问该档案');
    }
    return profile;
  }

  async getView(userId: string, profileId: string): Promise<ProfileView> {
    const profile = await this.getOwnedOrThrow(userId, profileId);
    return this.toView(profile);
  }

  /**
   * 解密出生信息，供排盘引擎使用。
   */
  decryptBirth(enc: string): BirthPayload {
    return JSON.parse(this.crypto.decrypt(enc)) as BirthPayload;
  }

  /**
   * 软删除 + 物理删除档案及关联数据。
   * 先软删除标记，再级联物理删除（满足数据权利）。
   */
  async remove(userId: string, profileId: string): Promise<void> {
    await this.getOwnedOrThrow(userId, profileId);
    // Chart / Report 通过外键级联删除
    await this.prisma.profile.delete({ where: { id: profileId } });
  }

  /**
   * 导出用户全部数据（明文，用于数据权利导出）。
   */
  async exportAll(userId: string): Promise<unknown> {
    const profiles = await this.prisma.profile.findMany({
      where: { userId, deletedAt: null },
      include: { charts: { include: { reports: true } } },
    });
    return profiles.map((p) => ({
      ...this.toView(p),
      birth: this.decryptBirth(p.birthDatetimeEnc),
      charts: p.charts.map((c) => ({
        id: c.id,
        engineVersion: c.engineVersion,
        chart: c.chartJson,
        createdAt: c.createdAt.toISOString(),
        reports: c.reports.map((r) => ({
          dimension: r.dimension,
          content: r.content,
          modelVersion: r.modelVersion,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    }));
  }

  private toView(profile: {
    id: string;
    name: string;
    gender: string;
    birthCalendar: string;
    birthDatetimeEnc: string;
    longitude: number;
    latitude: number;
    hourKnown: boolean;
    useTrueSolarTime: boolean;
    isLeapMonth: boolean;
    createdAt: Date;
  }): ProfileView {
    const birth = this.decryptBirth(profile.birthDatetimeEnc);
    return {
      id: profile.id,
      name: profile.name,
      gender: profile.gender as 'male' | 'female',
      calendar: profile.birthCalendar as 'solar' | 'lunar',
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute,
      longitude: profile.longitude,
      latitude: profile.latitude,
      hourKnown: profile.hourKnown,
      useTrueSolarTime: profile.useTrueSolarTime,
      isLeapMonth: profile.isLeapMonth,
      createdAt: profile.createdAt.toISOString(),
    };
  }
}
