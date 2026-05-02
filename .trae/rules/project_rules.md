# Article Flow Project Rules

## 项目结构

- 后端：`/backend`，Flask + 本地 JSON 文件存储
- 前端：`/frontend`，Next.js + React + Tailwind CSS
- 数据目录：`/backend/data/`，存储 JSON 文件（projects.json 等）

## 后端

### 虚拟环境

- 路径：`/backend/venv`
- 创建：`/opt/homebrew/bin/python3 -m venv /backend/venv`
- 激活：`source /backend/venv/bin/activate`
- 依赖安装：`pip install -r /backend/requirements.txt`
- 启动命令：`source /backend/venv/bin/activate && cd /backend && python run.py`
- 运行端口：5001
- 健康检查：`curl http://localhost:5001/api/health`

### 注意事项

- Flask 设置了 `strict_slashes = False`，URL 末尾有无斜杠均可
- CORS 已配置，允许前端跨域访问
- 存储使用本地 JSON 文件，不依赖 MongoDB
- `_id` 字段在 snake_to_camel 转换中保持不变（不以 `_` 开头的键才转换）

## 前端

### 启动

- 安装依赖：`cd /frontend && npm install`
- 启动开发服务器：`cd /frontend && npm run dev`
- 运行端口：3000
- 访问地址：http://localhost:3000

### 注意事项

- API 客户端在 `frontend/src/lib/api/client.ts`，包含 Axios 响应拦截器自动转换 snake_case → camelCase
- 格式处理页面在 `frontend/src/app/projects/[id]/format/page.tsx`

## Git 工作流

- 推送和创建 PR 使用 GitHub 网页，不使用 gh cli
- 不要更改 README.md
- 后端 `data/` 目录下的 JSON 文件是运行时数据，提交时应 `git checkout HEAD -- backend/data/` 排除变更
