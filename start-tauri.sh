#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 启动 Article Flow 桌面版 (Tauri) ==="

# 清理旧 Tauri / Next 进程（保留或重启后端）
pkill -f "tauri dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# 后端
echo "[1/3] 启动后端 (Flask :5001)..."
cd "$PROJECT_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  已创建 backend/.env（请填写 LLM_API_KEY）"
fi
source venv/bin/activate
"$PROJECT_DIR/backend/venv/bin/python" -m pip install -q "ddgs>=9.0.0,<10.0.0" 2>/dev/null || true
if ! curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
  lsof -ti :5001 | xargs kill -9 2>/dev/null || true
  sleep 1
  nohup "$PROJECT_DIR/backend/venv/bin/python" run.py > /tmp/article-flow-backend.log 2>&1 &
  echo "  后端已启动 (日志: /tmp/article-flow-backend.log)"
else
  echo "  后端已在运行"
fi

# 等待后端就绪
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Tauri GUI（会自动 npm run dev → localhost:3000）
echo "[2/3] 启动 Tauri 桌面窗口..."
echo "[3/3] 首次编译可能需 1–2 分钟，请稍候..."
cd "$PROJECT_DIR/frontend"
exec npm run tauri:dev
