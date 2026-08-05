import { Injectable, Logger } from '@nestjs/common';
import { calculateBazi, ENGINE_VERSION } from '@app/bazi-engine';
import type { BaziChart, BirthInput } from '@app/bazi-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { RedisService } from '../../redis/redis.service';
import { ProfilesService, BirthPayload } from '../profiles/profiles.service';

/**
 * 排盘结果视图。
 */
export interface ChartResult {
  chartId: string;
  engineVersion: string;
  chart: BaziChart;
  cached: boolean;
}

/**
 * 排盘服务：解密出生信息 → 调用引擎 → 缓存并落库。
 *
 * 引擎为纯函数，相同输入必得相同结果，故对 (输入指纹 + 引擎版本) 做缓存去重。
 */
@Injectable()
export class ChartsService {
  private readonly logger = new Logger(ChartsService.name);
  private static readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 天

  /** 正在进行的排盘任务（同 profileId+inputHash 合并并发） */
  private readonly inflight = new Map<
    string,
    Promise<ChartResult>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly redis: RedisService,
    private readonly profiles: ProfilesService,
  ) {}

  /**
   * 为指定档案排盘。
   *
   * 幂等策略：同一 (profileId, inputHash) 并发请求会合并到同一个 Promise，
   * 避免重复落库；用户重复点击"重新生成"不会重复创建 chart 行。
   */
  async calculate(userId: string, profileId: string): Promise<ChartResult> {
    const profile = await this.profiles.getOwnedOrThrow(userId, profileId);
    const birth = this.profiles.decryptBirth(profile.birthDatetimeEnc);

    const input = this.toBirthInput(
      birth,
      profile.gender as 'male' | 'female',
      profile.longitude,
      profile.latitude,
      profile.useTrueSolarTime,
    );
    const inputHash = this.crypto.hash(`${ENGINE_VERSION}:${JSON.stringify(input)}`);
    const inflightKey = `${profileId}:${inputHash}`;
    const existing = this.inflight.get(inflightKey);
    if (existing) {
      this.logger.debug(`合并并发请求: ${inflightKey}`);
      return existing;
    }

    const task = this.runCalculate(profileId, inputHash, input);
    this.inflight.set(inflightKey, task);
    try {
      return await task;
    } finally {
      this.inflight.delete(inflightKey);
    }
  }

  private async runCalculate(
    profileId: string,
    inputHash: string,
    input: BirthInput,
  ): Promise<ChartResult> {
    // Redis 缓存
    const cacheKey = `chart:${inputHash}`;
    const cachedRaw = await this.redis.get(cacheKey);
    if (cachedRaw) {
      const chart = JSON.parse(cachedRaw) as BaziChart;
      const persisted = await this.ensurePersisted(profileId, inputHash, chart);
      return { chartId: persisted.id, engineVersion: ENGINE_VERSION, chart, cached: true };
    }

    // 数据库缓存（同一档案同一输入已算过）
    const existing = await this.prisma.chart.findFirst({
      where: { profileId, inputHash },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const chart = existing.chartJson as unknown as BaziChart;
      await this.redis.set(cacheKey, JSON.stringify(chart), ChartsService.CACHE_TTL);
      return { chartId: existing.id, engineVersion: existing.engineVersion, chart, cached: true };
    }

    // 实际排盘（纯函数调用，最多 1 次）
    const chart = calculateBazi(input);
    const saved = await this.prisma.chart.create({
      data: {
        profileId,
        engineVersion: ENGINE_VERSION,
        chartJson: chart as unknown as object,
        inputHash,
      },
    });
    await this.redis.set(cacheKey, JSON.stringify(chart), ChartsService.CACHE_TTL);

    return { chartId: saved.id, engineVersion: ENGINE_VERSION, chart, cached: false };
  }

  /**
   * 读取已保存的排盘（含权限校验）。
   *
   * 懒迁移：若数据库中的命盘是旧引擎版本（日柱 twelveStage 缺失），
   * 自动用最新引擎重新计算并更新数据库，确保线上旧数据也能修复。
   */
  async getChart(userId: string, chartId: string): Promise<ChartResult> {
    const chart = await this.prisma.chart.findUnique({
      where: { id: chartId },
      include: { profile: true },
    });
    if (!chart || chart.profile.userId !== userId || chart.profile.deletedAt) {
      throw new Error('排盘结果不存在或无权访问');
    }

    const baziChart = chart.chartJson as unknown as BaziChart;

    // 懒迁移：旧引擎版本或日柱 twelveStage 缺失时，重新计算
    if (
      chart.engineVersion !== ENGINE_VERSION ||
      !baziChart.pillars?.day?.twelveStage
    ) {
      try {
        const birth = this.profiles.decryptBirth(chart.profile.birthDatetimeEnc);
        const input = this.toBirthInput(
          birth,
          chart.profile.gender as 'male' | 'female',
          chart.profile.longitude,
          chart.profile.latitude,
          chart.profile.useTrueSolarTime,
        );
        const recalculated = calculateBazi(input);
        const newInputHash = this.crypto.hash(`${ENGINE_VERSION}:${JSON.stringify(input)}`);

        await this.prisma.chart.update({
          where: { id: chartId },
          data: {
            engineVersion: ENGINE_VERSION,
            chartJson: recalculated as unknown as object,
            inputHash: newInputHash,
          },
        });

        // 同步更新 Redis 缓存
        const cacheKey = `chart:${newInputHash}`;
        await this.redis.set(cacheKey, JSON.stringify(recalculated), ChartsService.CACHE_TTL);

        this.logger.log(`命盘 ${chartId} 已从 ${chart.engineVersion} 懒迁移至 ${ENGINE_VERSION}`);

        return {
          chartId: chart.id,
          engineVersion: ENGINE_VERSION,
          chart: recalculated,
          cached: true,
        };
      } catch (err) {
        this.logger.warn(`命盘 ${chartId} 懒迁移失败，返回旧数据: ${err instanceof Error ? err.message : err}`);
      }
    }

    return {
      chartId: chart.id,
      engineVersion: chart.engineVersion,
      chart: baziChart,
      cached: true,
    };
  }

  private async ensurePersisted(profileId: string, inputHash: string, chart: BaziChart) {
    const existing = await this.prisma.chart.findFirst({
      where: { profileId, inputHash },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.chart.create({
      data: {
        profileId,
        engineVersion: ENGINE_VERSION,
        chartJson: chart as unknown as object,
        inputHash,
      },
    });
  }

  private toBirthInput(
    birth: BirthPayload,
    gender: 'male' | 'female',
    longitude: number,
    latitude: number,
    useTrueSolarTime: boolean,
  ): BirthInput {
    return {
      calendar: birth.calendar,
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute,
      gender,
      longitude,
      latitude,
      useTrueSolarTime,
      isLeapMonth: birth.isLeapMonth,
    };
  }

  /**
   * 批量修复所有旧版 chart 数据（补齐 twelveStage 等新字段）。
   * 可通过管理接口或应用启动时调用。
   */
  async migrateAllCharts(): Promise<{ fixed: number; failed: number; skipped: number }> {
    const charts = await this.prisma.chart.findMany({
      include: { profile: true },
    });

    let fixed = 0;
    let failed = 0;
    let skipped = 0;

    for (const chart of charts) {
      const baziChart = chart.chartJson as any;
      const needsFix =
        chart.engineVersion !== ENGINE_VERSION ||
        !baziChart?.pillars?.day?.twelveStage;

      if (!needsFix) {
        skipped++;
        continue;
      }

      try {
        const birth = this.profiles.decryptBirth(chart.profile.birthDatetimeEnc);
        const input = this.toBirthInput(
          birth,
          chart.profile.gender as 'male' | 'female',
          chart.profile.longitude,
          chart.profile.latitude,
          chart.profile.useTrueSolarTime,
        );
        const recalculated = calculateBazi(input);
        const newInputHash = this.crypto.hash(`${ENGINE_VERSION}:${JSON.stringify(input)}`);

        await this.prisma.chart.update({
          where: { id: chart.id },
          data: {
            engineVersion: ENGINE_VERSION,
            chartJson: recalculated as unknown as object,
            inputHash: newInputHash,
          },
        });

        // 更新 Redis 缓存
        const cacheKey = `chart:${newInputHash}`;
        await this.redis.set(cacheKey, JSON.stringify(recalculated), ChartsService.CACHE_TTL);

        this.logger.log(`修复命盘 ${chart.id}: ${baziChart?.pillars?.day?.twelveStage || '缺失'} → ${recalculated.pillars.day.twelveStage}`);
        fixed++;
      } catch (err) {
        this.logger.warn(`命盘 ${chart.id} 修复失败: ${err instanceof Error ? err.message : err}`);
        failed++;
      }
    }

    this.logger.log(`批量迁移完成: 修复 ${fixed}, 跳过 ${skipped}, 失败 ${failed}`);
    return { fixed, failed, skipped };
  }
}
