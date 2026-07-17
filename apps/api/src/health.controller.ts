import { Controller, Get } from '@nestjs/common';
import { ENGINE_VERSION } from '@app/bazi-engine';

/**
 * 健康检查与版本信息。
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      engineVersion: ENGINE_VERSION,
      time: new Date().toISOString(),
    };
  }
}
