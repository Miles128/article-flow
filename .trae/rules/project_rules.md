# Article Flow Project Rules

## 项目结构

- 后端：`/backend`，Flask + 本地 JSON 文件存储，使用 uv 管理依赖
- 前端：`/frontend`，Next.js + React + Tailwind CSS
- 数据目录：`/backend/data/`，存储 JSON 文件（projects.json 等）

## 后端

### 虚拟环境（uv）

- 包管理器：uv（`/opt/homebrew/bin/uv`）
- 虚拟环境：`/backend/.venv`（uv 自动创建）
- 安装依赖：`cd /backend && uv sync`
- 添加依赖：`cd /backend && uv add <package>`
- 启动命令：`cd /backend && uv run python run.py`
- 运行端口：5001
- 健康检查：`curl http://localhost:5001/api/health`

### 环境变量（可选）

后端优先从环境变量读取 LLM 配置，未设置时从请求中的用户输入读取：

| 变量 | 用途 |
|------|------|
| `LLM_API_KEY` | API Key（推荐设，避免前端传输） |
| `LLM_BASE_URL` | API 地址 |
| `LLM_MODEL_NAME` | 默认模型名 |

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
