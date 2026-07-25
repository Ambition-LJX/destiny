# Destiny 部署命令手册

> 唯一对外端口：`8080`（浏览器通过 `ip:8080` 访问）。PostgreSQL / Redis / API 仅容器内网通信，不映射宿主机，多项目并存互不冲突。

## 前置要求

- Docker + Docker Compose（最新稳定版）
- 已安装 Corepack/Pnpm（仅本地非容器开发需要）

## 环境变量文件

| 文件 | 用途 |
|---|---|
| `.env.example` | 变量参考模板，不参与运行 |
| `.env.docker.dev` | 开发环境变量 |
| `.env.docker.prod` | 生产环境变量（上线前必须替换所有密钥）|

生成强密钥：`openssl rand -hex 32`

---

## 一、开发环境

```bash
# 1. 按需修改开发变量
#    vi .env.docker.dev

# 2. 构建并启动（前台，带热重载）
docker compose --env-file .env.docker.dev -f docker-compose.dev.yml up

# 2. 或后台启动
docker compose --env-file .env.docker.dev -f docker-compose.dev.yml up -d

# 3. 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 4. 停止
docker compose -f docker-compose.dev.yml down
```

访问：`http://localhost:8080`

---

## 二、生产环境

```bash
# 1. 修改生产变量（替换所有 REPLACE_WITH_* 密钥与 CORS_ORIGIN）
#    vi .env.docker.prod

# 2. 构建并后台启动
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build

# 3. 查看状态与日志
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# 4. 停止
docker compose -f docker-compose.prod.yml down

# 5. 停止并清空数据卷（清空数据库，慎用）
docker compose -f docker-compose.prod.yml down -v
```

访问：`http://<服务器IP>:8080`

---

## 三、常用维护

```bash
# 重新构建某个服务（如改了代码）
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build web

# 进入 API 容器执行命令
docker exec -it destiny-prod-api sh

# 写入命理知识库种子（可选）
docker exec -it destiny-prod-api pnpm seed
```

## 四、接入真实大模型

编辑 `.env.docker.dev` 或 `.env.docker.prod`：

```
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-xxxxxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

重启对应服务即可。不配置 `LLM_API_KEY` 时自动使用离线 Mock 适配器（排盘真实，解读为模拟文本）。
