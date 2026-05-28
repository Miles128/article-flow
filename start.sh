#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
# shellcheck source=scripts/uv-env.sh
source "$PROJECT_DIR/scripts/uv-env.sh"

echo "=== 启动 Article Flow 前后端 ==="

echo "[1/4] 清理旧进程..."
pkill -f "python run.py" 2>/dev/null || true
pkill -f "Python run.py" 2>/dev/null || true
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo "[2/4] 启动后端 (Flask :5001)..."
cd "$BACKEND_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  已创建 backend/.env（请填写 LLM_API_KEY）"
fi

if article_flow_prepare_uv "$BACKEND_DIR"; then
  RUNNER="uv run python"
elif [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  echo "  uv 不可用或 sync 失败，使用已有 .venv"
  RUNNER="$BACKEND_DIR/.venv/bin/python"
else
  if [ ! -d venv ] && [ ! -d .venv ]; then
    python3 -m venv venv
  fi
  # shellcheck disable=SC1091
  if [ -d .venv ]; then source .venv/bin/activate; else source venv/bin/activate; fi
  pip install -q -e ".[dev]" 2>/dev/null || pip install -q -e .
  RUNNER="python"
fi

export FLASK_HOST="${FLASK_HOST:-127.0.0.1}"
nohup $RUNNER run.py > /tmp/article-flow-backend.log 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID (host=$FLASK_HOST)"

echo "[3/4] 启动前端 (Next.js :3000)..."
cd "$PROJECT_DIR/frontend"
nohup npm run dev > /tmp/article-flow-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

echo "[4/4] 等待服务就绪..."
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:5001/api/health > /dev/null 2>&1 && curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo ""
    echo "✅ 后端: http://localhost:5001 (日志: /tmp/article-flow-backend.log)"
    echo "✅ 前端: http://localhost:3000 (日志: /tmp/article-flow-frontend.log)"
    echo ""
    echo "停止命令: kill $BACKEND_PID $FRONTEND_PID"
    exit 0
  fi
  sleep 2
done

echo "⚠️  等待超时，请检查日志"
echo "  后端: tail -f /tmp/article-flow-backend.log"
echo "  前端: tail -f /tmp/article-flow-frontend.log"
