import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { BillingModule } from '../billing/billing.module';
import { ReportsModule } from '../reports/reports.module';

/**
 * 管理员模块：双角色（超级/普通）认证 + 订单/用户/日志/成本管理。
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    BillingModule,
    ReportsModule,
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminAuthService,
    AdminService,
    AdminJwtStrategy,
    AdminAuthGuard,
    SuperAdminGuard,
  ],
})
export class AdminModule {}