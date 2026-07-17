import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/**
 * 全局加密模块，供数据服务加解密敏感字段。
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
