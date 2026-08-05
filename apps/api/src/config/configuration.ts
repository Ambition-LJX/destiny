/**
 * 应用配置：集中读取环境变量，提供类型化访问。
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    /** 管理员令牌（独立密钥，与普通用户隔离） */
    adminSecret: string;
    adminExpiresIn: string;
  };
  encryption: {
    /** 32 字节密钥（hex 或原文），用于出生信息 AES-256-GCM 加密 */
    key: string;
  };
  redis: {
    url: string;
  };
  llm: {
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  admin: {
    /** 管理接口访问令牌（成本统计等运营接口用），为空则禁用 */
    token: string;
  };
  bootstrap: {
    /** 首次引导：把该邮箱设为超级管理员（不存在则自动创建） */
    superAdminEmail: string;
    /** 首次引导：超级管理员初始密码（仅当账号不存在时用于创建） */
    superAdminPassword: string;
  };
  billing: {
    /** 完整版解锁价格（人民币） */
    unlockPrice: number;
    /** 微信收款码图片 URL（扫码代收） */
    qrWechat: string;
    /** 支付宝收款码图片 URL（扫码代收） */
    qrAlipay: string;
    /** 客服联系方式（展示给用户，用于对账） */
    contact: string;
    /** 解锁完整版生效天数；0 表示永久 */
    proDays: number;
  };
}

export default (): AppConfig => ({
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    adminSecret: process.env.JWT_ADMIN_SECRET ?? 'dev-admin-secret-change-me',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN ?? '12h',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'openai',
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL ?? 60),
    limit: Number(process.env.THROTTLE_LIMIT ?? 30),
  },
  admin: {
    token: process.env.ADMIN_TOKEN ?? '',
  },
  bootstrap: {
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? '',
    superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? '',
  },
  billing: {
    unlockPrice: Number(process.env.BILLING_UNLOCK_PRICE ?? 9.9),
    qrWechat: process.env.BILLING_QR_WECHAT ?? '',
    qrAlipay: process.env.BILLING_QR_ALIPAY ?? '',
    contact: process.env.BILLING_CONTACT ?? '',
    proDays: Number(process.env.BILLING_PRO_DAYS ?? 0),
  },
});
