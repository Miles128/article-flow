# Article Flow

面向内容创作者的桌面端自媒体文章全流程工作流管理平台。**Tauri + Next.js 前端 + Python Flask 后端**，本地 JSON 文件存储，零外部数据库依赖。

## 核心特性

### 10 步工作流（文章型）

灵活进入任意步骤，无需固定顺序：

| 步骤 | 名称 | 功能 |
|------|------|------|
| 1 | 热搜选题 | 多平台热搜聚合、热点趋势分析、智能选题挖掘 |
| 2 | 确定选题 | AI 多维评估、选题卡片管理、状态追踪 |
| 3 | 搜集资料 | 多源采集、**一键深度分析**（联网+资料→五段报告）、主张登记、来源核查 |
| 4 | 列出大纲 | AI 生成、信息/经验型章节标记 |
| 5 | 写出草稿 | 按节写作、四模式、去AI味规则引擎 |
| 6 | 标题工坊 | 爆款标题、副标题、封面文案 |
| 7 | 修改审核 | 内容→风格→细节 一键审校流水线 |
| 8 | 格式处理 | Markdown 规范化、多平台格式适配 |
| 9 | 生成配图 | 多配色 HTML 配图 |
| 10 | 发布准备 | 发布清单、标准 ZIP 导出、母稿派生、终审报告 |

### 配图生成

- 20 种配色方案 + 自定义配色
- 6 种比例选择（3:4 / 9:16 / 4:3 / 16:9 / 1:1 / 2:3）
- AI 提示词模板
- HTML 导出 / 打印 PNG

### 工作区

- 本地文件夹作为工作区，自动扫描 MD 文件
- 导入/导出 Markdown 到工作区
- 工作区路径记忆，下次打开自动加载

### AI 写作辅助

| 功能 | 说明 |
|------|------|
| AI 续写 | 保持风格一致继续写作 |
| 智能润色 | 优化表达，提升质量 |
| 风格转换 | 正式/轻松/学术/诗意/幽默（低浓度仅改部分句子） |
| 内容扩写 | 增加细节和例子 |
| 内容精简 | 压缩至 50%，保留核心 |
| AI 味检测 | 连接词比率、套话占比、句式多样性、情感自然度 |

### 多平台格式适配

公众号 / 知乎 / 小红书 / B站专栏 / 简书 / 今日头条

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面壳 | Tauri | 跨平台桌面应用 |
| 前端 | Next.js 14 + React 18 + TypeScript | App Router |
| 样式 | Tailwind CSS | Notion 风格配色 |
| 状态 | Zustand + localStorage | 持久化工作区和配置 |
| 后端 | Flask | Python REST API |
| AI | LangChain | 多模型支持 |
| 存储 | 本地 JSON 文件 | 零外部数据库依赖 |

## 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.10
- Rust (Tauri 构建)

### 配置 LLM（必填）

```bash
cd backend
cp .env.example .env   # 首次启动；start.sh 也会自动创建
# 编辑 .env，至少填写 LLM_API_KEY=
```

### 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate
uv sync   # 或 pip install -e .
python run.py
```

后端运行在 http://localhost:5001。`GET /api/health` 返回 `llm_configured` 表示 Key 是否已配置。

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:3000

### 启动 Tauri 桌面应用

```bash
cd frontend
npm run tauri dev
```

## 项目结构

```
article-flow/
├── backend/
│   ├── app/
│   │   ├── routes/          # API 路由
│   │   ├── services/        # LLM / 热搜服务
│   │   ├── models/          # 数据模型
│   │   └── config.py        # 配置
│   ├── data/                # JSON 运行时数据（不提交）
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 页面
│   │   │   ├── page.tsx     # 首页
│   │   │   └── projects/[id]/
│   │   │       ├── hotnews/ # 热搜选题
│   │   │       ├── topics/  # 确定选题
│   │   │       ├── research/# 搜集资料
│   │   │       ├── outline/ # 列出大纲
│   │   │       ├── writing/ # 写出草稿
│   │   │       ├── review/  # 修改审核
│   │   │       ├── format/  # 格式处理
│   │   │       └── illustration/ # 配图生成
│   │   ├── components/
│   │   │   ├── layout/      # Sidebar
│   │   │   ├── modal/       # 设置/工作区弹窗
│   │   │   └── ui/          # Markdown 编辑器
│   │   ├── lib/
│   │   │   ├── api/         # API 客户端
│   │   │   └── store/       # Zustand 状态
│   │   └── styles/          # 全局样式
│   ├── src-tauri/           # Tauri 配置
│   └── tailwind.config.js
│
└── README.md
```

## API 概览

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 项目 | `/api/projects` | CRUD |
| 写作 | `/api/writing` | 续写/润色/扩写/精简/AI味检测 |
| 格式 | `/api/format` | 平台转换/导出 |
| 热搜 | `/api/hotnews` | 多平台聚合/趋势分析 |
| 选题 | `/api/topics` | 评估/管理 |
| 大纲 | `/api/outline` | 生成/编辑 |
| 资料 | `/api/research` | 采集/摘要 |
| 审核 | `/api/review` | 评论/合规检查 |

## 许可证

MIT License
