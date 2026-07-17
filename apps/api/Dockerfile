# syntax=docker/dockerfile:1
# ---- 多阶段构建：NestJS API（monorepo 感知） ----

FROM node:20-alpine AS base
# Prisma 在 Alpine(musl) 上需要 openssl 与 libc 兼容层，否则 schema-engine 会因探测不到
# libssl 版本而回退到错误的引擎二进制，导致 "Could not parse schema engine response"
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
WORKDIR /repo

# ---- 依赖安装 ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/bazi-engine/package.json packages/bazi-engine/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# ---- 构建 ----
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/bazi-engine/node_modules ./packages/bazi-engine/node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
# 复制 packageManager 声明与工作区配置，确保 corepack 使用锁定的 pnpm 版本
COPY pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages/bazi-engine ./packages/bazi-engine
COPY apps/api ./apps/api

# 先构建引擎，再生成 Prisma Client 并构建 API
RUN pnpm --filter @app/bazi-engine build \
  && pnpm --filter @app/api prisma:generate \
  && pnpm --filter @app/api build

# ---- 运行时 ----
FROM base AS runtime
ENV NODE_ENV=production
# 复制 packageManager 声明与工作区配置，确保 corepack 使用锁定的 pnpm 版本
COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/bazi-engine ./packages/bazi-engine
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api

EXPOSE 3001
# 启动前同步数据库结构（首次部署用 db push 建表），随后启动服务
CMD ["sh", "-c", "pnpm prisma:push && node dist/main.js"]
