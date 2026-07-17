# syntax=docker/dockerfile:1
# ---- 多阶段构建：Next.js Web ----

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- 依赖安装 ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile=false --filter @app/web...

# ---- 构建 ----
FROM base AS build
ARG NEXT_PUBLIC_API_BASE=/api
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
# Next.js 在构建期将 rewrites() 的 destination 固化进 routes-manifest.json，
# 运行时不再读取 API_PROXY_TARGET，故必须在构建期注入容器网络内的 API 地址。
ARG API_PROXY_TARGET=http://localhost:3001
ENV API_PROXY_TARGET=$API_PROXY_TARGET
# 开启 standalone 产物（Linux 容器可正常创建 symlink）
ENV BUILD_STANDALONE=1
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
# 复制 packageManager 声明与工作区配置，确保 corepack 使用锁定的 pnpm 版本
COPY pnpm-workspace.yaml package.json ./
COPY apps/web ./apps/web
WORKDIR /repo/apps/web
RUN pnpm build

# ---- 运行时（standalone） ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
