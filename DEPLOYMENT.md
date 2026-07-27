# Destiny 部署命令手册

> 唯一对外端口：`WEB_PORT`（默认 `8080`，浏览器通过 `ip:8080` 访问）。
> PostgreSQL / Redis / API 仅在容器内网通信，不映射到宿主机端口。
> 容器名、网络、数据卷全部以 `destiny-dev-` / `destiny-prod-` 为前缀，与其他项目互不冲突。

## 环境变量文件

| 文件 | 用途 |
|---|---|
| `.env.example` | 参考模板，不参与运行 |
| `.env.docker.dev` | 开发环境变量 |
| `.env.docker.prod` | 生产环境变量（部署前必须替换全部 `replace-with-*` 占位符） |

生成强密钥：`openssl rand -hex 32`

## 一、开发环境

```bash
# 1. 按需修改开发变量
#    编辑 .env.docker.dev

# 2. 构建并启动（前台，带热重载）
docker compose --env-file .env.docker.dev -f docker-compose.dev.yml up

# 2. 或后台启动
docker compose --env-file .env.docker.dev -f docker-compose.dev.yml up -d

# 3. 查看日志 / 状态
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml ps

# 4. 停止
docker compose -f docker-compose.dev.yml down

# 5. 停止并清空数据卷（清空本地数据库与缓存，慎用）
docker compose -f docker-compose.dev.yml down -v
```

访问：`http://localhost:8080`

## 二、生产环境

```bash
# 1. 修改生产变量（替换所有 replace-with-* 与 CORS_ORIGIN）
#    编辑 .env.docker.prod

# 2. 构建并后台启动
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build

# 3. 查看状态与日志
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# 4. 重新构建单个服务（如改了 web 代码）
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build web

# 5. 停止
docker compose -f docker-compose.prod.yml down

# 6. 停止并清空数据卷（清空数据库，慎用）
docker compose -f docker-compose.prod.yml down -v
```

访问：`http://<服务器IP>:8080`

## 三、接入真实大模型

编辑 `.env.docker.dev` 或 `.env.docker.prod`：

```
LLM_PROVIDER=openai
LLM_API_KEY=sk-xxxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

仅重启 `api` 服务即可生效；不配置 `LLM_API_KEY` 时自动使用离线 Mock 适配器（排盘真实，解读为模拟文本）。

## 四、常见排错

### `password authentication failed for user "destiny"`

`POSTGRES_PASSWORD` 与数据卷里的旧密码不一致。生产配置已挂密码自愈入口（`docker/postgres-entrypoint.sh`），每次 `up -d` 会自动同步密码。仅在自愈钩子被绕过时，才需要硬重置：

```bash
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml down -v
docker volume rm destiny-prod-pgdata destiny-prod-redisdata
docker compose --env-file .env.docker.prod -f docker-compose.prod.yml up -d --build
```

### `Failed to find Server Action "x"`

Next.js RSC Server Action 在 standalone 模式下会基于构建时哈希生成 action id，浏览器缓存的旧 HTML 与新构建产物不匹配时会触发。强制刷新浏览器（Ctrl+Shift+R / Cmd+Shift+R）即可。