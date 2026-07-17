import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 服务：排盘结果缓存、限流计数等。
 * 连接失败时降级为不可用（isReady=false），不阻断主流程。
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('redis.url');
    if (!url) {
      this.logger.warn('未配置 REDIS_URL，缓存功能降级为不可用');
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    this.client.on('error', (err) => {
      this.ready = false;
      this.logger.warn(`Redis 连接异常，缓存降级: ${err.message}`);
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis 已连接');
    });
    this.client.connect().catch((err) => {
      this.logger.warn(`Redis 初次连接失败，缓存降级: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }

  get isReady(): boolean {
    return this.ready && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady) return null;
    try {
      return await this.client!.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady) return;
    try {
      if (ttlSeconds) {
        await this.client!.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client!.set(key, value);
      }
    } catch {
      /* 缓存写入失败不影响主流程 */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady) return;
    try {
      await this.client!.del(key);
    } catch {
      /* ignore */
    }
  }

  /**
   * 原子自增计数器，用于限流。返回当前计数值。
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (!this.isReady) return 0;
    try {
      const count = await this.client!.incr(key);
      if (count === 1) {
        await this.client!.expire(key, ttlSeconds);
      }
      return count;
    } catch {
      return 0;
    }
  }
}
