#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
# shellcheck source=scripts/uv-env.sh
source "$PROJECT_DIR/scripts/uv-env.sh"

echo "=== 启动 Article Flow 桌面版 (Tauri) ==="

pkill -f "tauri dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo "[1/3] 启动后端 (Flask :5001)..."
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
  if [ -d .venv ]; then source .venv/bin/activate; else source venv/bin/activate; fi
  pip install -q -e ".[dev]" 2>/dev/null || pip install -e .
  RUNNER="python"
fi

export FLASK_HOST="${FLASK_HOST:-127.0.0.1}"
if ! curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
  lsof -ti :5001 | xargs kill -9 2>/dev/null || true
  sleep 1
  nohup $RUNNER run.py > /tmp/article-flow-backend.log 2>&1 &
  echo "  后端已启动 (日志: /tmp/article-flow-backend.log)"
else
  echo "  后端已在运行"
fi

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[2/3] 启动 Tauri 桌面窗口..."
cd "$PROJECT_DIR/frontend"
exec npm run tauri:dev
