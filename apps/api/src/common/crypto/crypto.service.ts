import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';

/**
 * 应用层加密服务。
 *
 * 使用 AES-256-GCM 加密敏感字段（出生时间等）。
 * 密文格式：base64(iv).base64(authTag).base64(cipher)
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('encryption.key') ?? '';
    // 统一派生为 32 字节密钥，兼容任意长度输入
    this.key = createHash('sha256').update(raw).digest();
  }

  /**
   * 加密明文，返回可存储的密文字符串。
   */
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join('.');
  }

  /**
   * 解密密文，返回明文。密文非法时抛错。
   */
  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('密文格式非法');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  }

  /**
   * 计算稳定哈希（用于排盘输入指纹，缓存去重）。
   */
  hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
