# 部署指南 · AI 八字命术系统

本文档为精简部署手册，覆盖工具安装、本地开发、生产部署（Docker）与常见问题。

---

## 一、环境要求与工具安装

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | ≥ 20 | 运行时 |
| pnpm | ≥ 9 | monorepo 包管理 |
| Docker + Docker Compose | 最新稳定版 | 一键部署（推荐） |
| PostgreSQL | ≥ 14（本地开发可选，Docker 已内置） | 数据库 |
| Redis | ≥ 6（本地开发可选，Docker 已内置） | 缓存 / 限流 |

### 1. 安装 Node.js 20+
- 官网下载：https://nodejs.org/ （选择 LTS 20.x 及以上）
- 验证：`node -v`

### 2. 启用 pnpm（推荐用 Corepack，无需单独安装）
```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm -v
```

### 3. 安装 Docker
- Windows / macOS：安装 Docker Desktop（https://www.docker.com/products/docker-desktop/）
- Linux：安装 docker-ce 与 docker compose 插件
- 验证：`docker -v` 与 `docker compose version`

---

## 二、快速启动（Docker Compose，推荐）

这是最省心的方式，一条命令拉起 Postgres、Redis、API、Web 四个服务。

```bash
# 1. 进入项目目录
cd destiny

# 2. 准备根环境变量（用于 compose 变量注入）
cp .env.example .env
# 按需修改 .env 中的密钥、LLM Key 等

# 3. 构建并启动全部服务
docker compose up -d --build

# 4. 查看状态与日志
docker compose ps
docker compose logs -f api
```

启动后访问：
- 前端：http://localhost:3000
- 后端健康检查：http://localhost:3001/api/health

> 首次启动时 API 容器会自动执行 `prisma db push` 建表，无需手动迁移。

### 写入命理知识库种子（可选）
RAG 默认使用内置内存语料即可工作。如需把知识库落库：
```bash
docker compose exec api pnpm seed
```

### 停止 / 清理
```bash
docker compose down            # 停止
docker compose down -v         # 停止并删除数据卷（清空数据库）
```

---

## 三、本地开发（不使用 Docker 跑应用）

适合开发调试。数据库与 Redis 仍建议用 Docker 起，应用本地跑。

```bash
# 1. 只用 Docker 起依赖服务
docker compose up -d postgres redis

# 2. 安装依赖
pnpm install

# 3. 配置后端环境变量
cp apps/api/.env.example apps/api/.env
# 确认 DATABASE_URL 指向 localhost:5432，REDIS_URL 指向 localhost:6379

# 4. 构建排盘引擎（其他包依赖它）
pnpm engine:build

# 5. 生成 Prisma Client 并同步表结构
pnpm --filter @app/api prisma:generate
pnpm --filter @app/api prisma:push

# 6. 启动后端（终端 1）
pnpm api:dev

# 7. 启动前端（终端 2）
cp apps/web/.env.example apps/web/.env.local   # 可选
pnpm web:dev
```

- 前端：http://localhost:3000
- 后端：http://localhost:3001/api

### 常用脚本（根目录）
| 命令 | 说明 |
|---|---|
| `pnpm engine:build` | 构建排盘引擎 |
| `pnpm engine:test` | 运行引擎测试（黄金用例） |
| `pnpm api:dev` | 启动后端（热重载） |
| `pnpm web:dev` | 启动前端（热重载） |
| `pnpm build` | 构建全部包 |
| `pnpm test` | 运行全部测试 |

---

## 四、环境变量说明

### 后端（`apps/api/.env`）
| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `REDIS_URL` | Redis 连接串（缓存/限流，可缺省降级） |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT 密钥，生产务必修改 |
| `ENCRYPTION_KEY` | 出生信息加密密钥（内部派生 32 字节） |
| `LLM_PROVIDER` | `openai`/`deepseek`/`moonshot`/`mock`（留空或 mock 走离线模拟） |
| `LLM_API_KEY` | 大模型 API Key（不配则自动使用 Mock 适配器） |
| `LLM_BASE_URL` | 兼容 OpenAI 协议的接口地址 |
| `LLM_MODEL` | 模型名 |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | 限流窗口（秒）与窗口内请求上限 |

> 未配置 `LLM_API_KEY` 时，系统自动使用内置 Mock 适配器，可离线体验完整流程（排盘真实、解读为模拟文本）。

### 前端（`apps/web/.env.local`）
| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_API_BASE` | 浏览器访问的 API 前缀，默认 `/api`（经 Next 代理） |
| `API_INTERNAL_URL` | Next 服务端把 `/api` 反代到的后端地址 |

---

## 五、接入真实大模型

1. 选择一个兼容 OpenAI Chat Completions 协议的供应商（OpenAI / DeepSeek / Moonshot / 通义千问兼容模式等）。
2. 在 `.env`（compose）或 `apps/api/.env`（本地）中设置：
```
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-xxxxxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```
3. 重启 API 服务即可，报告与问答将走真实流式解读。

---

## 六、生产部署建议

- **密钥管理**：`JWT_*`、`ENCRYPTION_KEY`、`LLM_API_KEY` 必须使用强随机值并通过密钥管理服务注入，切勿入库或提交仓库。
- **HTTPS**：在 Web/API 前置 Nginx 或云负载均衡终止 TLS。
- **数据库迁移**：生产建议改用受控迁移流程（`prisma migrate deploy`）而非 `db push`，先在本地 `prisma migrate dev` 生成迁移文件并提交。
- **备份**：定期备份 Postgres 数据卷 `pgdata`。
- **可观测性**：接入日志收集与告警，关注 LLM 调用错误率与限流命中。

---

## 七、常见问题

**Q：启动后前端调用接口 404 / 跨域？**
A：确认 API 已启动且 `CORS_ORIGIN` 含前端地址；Docker 部署下前端通过 `API_INTERNAL_URL=http://api:3001` 反代，无需跨域。

**Q：没有大模型 Key 能用吗？**
A：能。不配置 `LLM_API_KEY` 会自动使用 Mock 适配器，排盘计算完全真实，AI 文本为模拟内容，用于演示与开发。

**Q：如何验证排盘引擎正确性？**
A：`pnpm engine:test` 运行黄金测试集（含节气边界、真太阳时、跨日子时等用例）。

**Q：数据库连不上？**
A：检查 `DATABASE_URL`；Docker 下服务名为 `postgres`，本地开发为 `localhost`。
