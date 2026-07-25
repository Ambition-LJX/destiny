# syntax=docker/dockerfile:1
# ---- 多阶段构建：Next.js Web (monorepo standalone) ----

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- 依赖安装 ----
FROM base AS deps
# 复制 workspace 根配置 + 所有包的 package.json（pnpm 需要完整 workspace 元数据）
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/bazi-engine/package.json packages/bazi-engine/
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
# 复制 node_modules
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
# 复制 workspace 配置 + 源码
COPY pnpm-workspace.yaml package.json ./
COPY packages/bazi-engine ./packages/bazi-engine
COPY apps/web ./apps/web
WORKDIR /repo/apps/web
RUN pnpm build

# ---- 运行时（standalone） ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
# Next.js standalone 在 monorepo 下输出结构为：
#   .next/standalone/
#     ├── node_modules/
#     └── apps/web/
#           ├── server.js
#           └── .next/  (不含 static)
COPY --from=build /repo/apps/web/.next/standalone ./
# 复制静态资源和 public 目录到对应位置
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
# 从 standalone 根目录启动，server.js 内部会正确解析 __dirname 定位 .next 与 public
CMD ["node", "apps/web/server.js"]
