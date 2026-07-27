#!/bin/sh
# postgres 容器启动钩子:在数据库 ready 之后,把 destiny 用户的密码
# 强制重写为当前 POSTGRES_PASSWORD 环境变量值。
#
# 解决问题:postgres 镜像只在数据卷为空时才用 POSTGRES_PASSWORD 创建用户。
# 如果 .env.docker.prod 的密码后来被改过,而数据卷里已有旧数据库,
# postgres 会跳过初始化 → 旧密码与新环境变量不一致 →
# api 容器 scram-sha-256 校验失败 → prisma db push 死循环。
# 本脚本保证无论数据卷何时初始化,密码永远与当前 .env 文件对齐。
set -e

# 原始入口脚本负责启动 postgres。我们要先让 postgres 跑起来再改密码,
# 但 docker-entrypoint.sh 会前台阻塞直到 postgres 退出,
# 所以这里采用"两阶段":先临时启动 postgres 改密码,再把控制权交还给原始入口。
# 注意:这里只关心改密码,postgres 的正式运行仍由原始入口脚本接管。

# 简化做法:直接覆盖 postgres 镜像原始入口脚本的执行流程,
# 自己启动 postgres、跑 SQL、再 exec 回原始入口保持前台运行。

# 1. 探测数据卷是否已有数据库(非空 → 跳过初始化的场景)
NEEDS_INIT=0
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  NEEDS_INIT=1
fi

# 2. 启动 postgres(原始入口脚本的所有初始化逻辑都靠它)
#    用 nohup + & 让它在后台跑,这样我们可以连进去改密码
echo "[postgres-entrypoint] starting postgres in background for password sync..."
nohup docker-entrypoint.sh "$@" >/var/log/postgres-runtime.log 2>&1 &
PG_PID=$!

# 3. 等数据库 ready
echo "[postgres-entrypoint] waiting for postgres..."
READY=0
for i in $(seq 1 60); do
  if pg_isready -U "${POSTGRES_USER:-destiny}" -d "${POSTGRES_DB:-destiny}" >/dev/null 2>&1; then
    READY=1
    echo "[postgres-entrypoint] postgres ready after ${i}s"
    break
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  echo "[postgres-entrypoint] postgres not ready, password sync skipped (still initializing?)"
  wait $PG_PID
  exit $?
fi

# 4. 同步密码
#    只有数据卷非空时才需要同步 —— 数据卷为空时,原始入口脚本会用 POSTGRES_PASSWORD 创建用户,密码天然一致。
if [ "$NEEDS_INIT" = "0" ]; then
  echo "[postgres-entrypoint] existing database detected, syncing password for '${POSTGRES_USER:-destiny}'..."
  # 用 unix socket + peer 认证,无需密码,以 postgres 操作系统用户身份连
  # 注意:postgres:16-alpine 镜像以 postgres 用户运行,PGUSER/PGHOST/PGPORT 控制连接参数
  PGUSER=postgres PGHOST=/var/run/postgresql psql -v ON_ERROR_STOP=1 \
    -c "ALTER USER \"${POSTGRES_USER:-destiny}\" WITH PASSWORD '${POSTGRES_PASSWORD}';" \
    || echo "[postgres-entrypoint] password sync failed (non-fatal, continuing)"
  echo "[postgres-entrypoint] password sync done"
fi

# 5. 把控制权交还给后台 postgres 进程,前台等待
wait $PG_PID