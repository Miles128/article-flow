#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 启动 Article Flow 前后端 ==="

# 杀掉旧进程
echo "[1/4] 清理旧进程..."
pkill -f "python run.py" 2>/dev/null || true
pkill -f "Python run.py" 2>/dev/null || true
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# 启动后端
echo "[2/4] 启动后端 (Flask :5001)..."
cd "$PROJECT_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  已创建 backend/.env（请填写 LLM_API_KEY）"
fi
source venv/bin/activate
"$PROJECT_DIR/backend/venv/bin/python" -m pip install -q "ddgs>=9.0.0,<10.0.0" 2>/dev/null || true
nohup "$PROJECT_DIR/backend/venv/bin/python" run.py > /tmp/article-flow-backend.log 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# 启动前端
echo "[3/4] 启动前端 (Next.js :3000)..."
cd "$PROJECT_DIR/frontend"
nohup npm run dev > /tmp/article-flow-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

# 等待启动
echo "[4/4] 等待服务就绪..."
for i in 1 2 3 4 5 6 7 8 9 10; do
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