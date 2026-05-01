# Article Flow

面向内容创作者的网页版自媒体文章全流程工作流管理平台。采用 **Next.js 前端 + Python Flask + LangChain 后端** 架构，核心集成功能完善的所见即所得 Markdown 编辑器，支持实时预览、格式工具栏、快捷键操作、版本历史和多格式导出。

## 核心特性

### 7 步工作流

灵活进入任意步骤，无需固定顺序，创作者可随时从任一环节开始或跳转。


| 步骤 | 名称 | 核心功能 |
|------|------|----------|
| 1 | 热搜选题 | 多平台热搜聚合（微博/知乎/B站/头条）、热点趋势分析、智能选题挖掘 |
| 2 | 确定选题 | 多维度 AI 评估、选题卡片管理、状态追踪（待评估/已选定/已否决） |
| 3 | 搜集资料 | 多源内容采集（网页/文件/图片/OCR）、AI 智能摘要生成、关键词提取、引用管理 |
| 4 | 列出大纲 | AI 智能生成、树形编辑、拖拽排序、模板库支持 |
| 5 | 写出草稿 | 大模型辅助写作（续写/润色/风格调整/扩写/精简）、AI 味检测、自动保存 |
| 6 | 修改审核 | 评论批注、AI 合规检查、逻辑一致性分析、自定义审核流程 |
| 7 | 格式处理 | Markdown 规范化、多平台格式适配（公众号/知乎/小红书等）、一键导出 |
=======
| 步骤 | 名称   | 核心功能                                      |
| -- | ---- | ----------------------------------------- |
| 1  | 热搜选题 | 多平台热搜聚合（微博/知乎/B站/头条）、热点趋势分析、智能选题挖掘        |
| 2  | 确定选题 | 多维度 AI 评估、选题卡片管理、状态追踪（待评估/已选定/已否决）        |
| 3  | 搜集资料 | 多源内容采集（网页/文件/图片/OCR）、AI 智能摘要生成、关键词提取、引用管理 |
| 4  | 列出大纲 | AI 智能生成、树形编辑、拖拽排序、模板库支持                   |
| 5  | 写出草稿 | 大模型辅助写作（续写/润色/风格调整/扩写/精简）、AI 味检测、自动保存     |
| 6  | 修改审核 | 评论批注、AI 合规检查、逻辑一致性分析、自定义审核流程              |
| 7  | 格式处理 | Markdown 规范化、多平台格式适配（公众号/知乎/小红书等）、一键导出    |


### Markdown 编辑器

- **多视图模式**：编辑模式、预览模式、双栏分屏模式
- **格式工具栏**：粗体、斜体、删除线、标题、列表、引用、代码、链接、图片
- **快捷键支持**：常用 Markdown 快捷键
- **实时渲染**：实时预览 Markdown 渲染效果
- **代码高亮**：支持多种编程语言语法高亮

### AI 写作辅助

基于 LangChain，支持多种大模型：


| **AI 味检测** | 从连接词比率、套话占比、句式多样性、情感自然度多维度分析 |

### 多平台格式适配

一键转换到主流自媒体平台格式：


| 平台 | 格式特点 |
|--------|----------|
| **微信公众号** | 段落≤150 字，对话式风格，适当使用 emoji |
| **知乎** | 结构清晰，使用 Markdown 标题层级，引用使用 > |
| **小红书** | 段落极短，添加话题标签 #，使用表情符号分隔 |
| **B站专栏** | 年轻风格，图文并茂 |
| **简书** | 标准 Markdown，简洁清新 |
| **今日头条** | 信息密度高，标题重要 |
=======


### 多模型支持

通过 LangChain 支持多种大模型供应商：

- **OpenAI**：GPT-4o、GPT-4 Turbo、GPT-3.5 Turbo
- **Anthropic**：Claude 3 Opus、Claude 3 Sonnet、Claude 3 Haiku
- **智谱 AI**：GLM-4、GLM-3 Turbo

可灵活切换不同模型，或同时配置多个模型。

## 技术栈

### 前端


| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.x | React 全栈框架，App Router |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化 CSS |
| Zustand | 4.x | 轻量级状态管理 |
| React Markdown | 9.x | Markdown 渲染 |
| Remark GFM | 4.x | GitHub Flavored Markdown 支持 |
| Lucide React | 1.x | 图标库 |
| Axios | 1.x | HTTP 客户端 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Flask | 3.x | Python Web 框架 |
| LangChain | 0.1.x | 大模型应用框架 |
| PyMongo | 4.x | MongoDB 驱动 |
| Beautiful Soup | 4.x | 网页解析 |
| Requests | 2.x | HTTP 请求 |
| Python Markdown | 3.x | Markdown 处理 |
=======


### 数据库

- **MongoDB**：文档型数据库，存储项目、选题、资料、评论等

## 快速开始

### 环境要求

- **Node.js** >= 18.x
- **Python** >= 3.10
- **MongoDB** >= 5.0（本地或 Docker）

### 1. 克隆项目

```bash
git clone https://github.com/Miles128/article-flow.git
cd article-flow
```

### 2. 后端配置

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 API Keys 和 MongoDB 配置
```

后端 `.env` 配置示例：

```env
SECRET_KEY=your-secret-key-here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=article_flow

# 大模型 API（至少配置一个）
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
ZHIPU_API_KEY=your-zhipu-key

# 默认模型配置
DEFAULT_MODEL_PROVIDER=openai
DEFAULT_MODEL_NAME=gpt-4-turbo-preview

# CORS
CORS_ORIGINS=http://localhost:3000
```

### 3. 前端配置

```bash
cd ../frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
```

前端 `.env.local` 配置：

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### 4. 启动服务

**启动后端：**

```bash
cd backend
source venv/bin/activate  # 如已激活可跳过
python run.py
```


后端地址：**http://localhost:5001**

**启动前端（新终端）：**

```bash
cd frontend
npm run dev
```


前端地址：**http://localhost:3000**

### 5. 访问应用

打开浏览器访问 **http://localhost:3000**


## 项目结构

```
article-flow/
├── backend/                          # Flask 后端
│   ├── app/
│   │   ├── routes/                   # API 路由
│   │   │   ├── ai.py                # AI 配置和测试
│   │   │   ├── format.py            # 格式转换和导出
│   │   │   ├── hotnews.py           # 热搜数据聚合
│   │   │   ├── outline.py           # 大纲管理
│   │   │   ├── projects.py          # 项目 CRUD
│   │   │   ├── research.py          # 资料搜集
│   │   │   ├── review.py            # 审核评论
│   │   │   ├── topics.py            # 选题管理
│   │   │   └── writing.py           # AI 写作辅助
│   │   ├── services/
│   │   │   ├── llm_service.py       # LangChain 多模型服务
│   │   │   └── hotnews_service.py   # 热搜聚合服务
│   │   ├── models/__init__.py       # MongoDB 数据模型
│   │   ├── config.py                 # 配置管理
│   │   └── __init__.py              # Flask 应用初始化
│   ├── requirements.txt              # Python 依赖
│   ├── run.py                        # 启动入口
│   └── .env.example                  # 环境变量示例
│
├── frontend/                         # Next.js 14 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # 首页（项目列表）
│   │   │   ├── layout.tsx            # 根布局
│   │   │   └── projects/
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # 项目详情页
│   │   │           ├── layout.tsx    # 项目布局
│   │   │           ├── hotnews/      # 热搜选题页
│   │   │           ├── topics/       # 确定选题页
│   │   │           ├── research/     # 搜集资料页
│   │   │           ├── outline/      # 列出大纲页
│   │   │           ├── writing/      # 写出草稿页
│   │   │           ├── review/       # 修改审核页
│   │   │           └── format/       # 格式处理页
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx    # 侧边栏导航
│   │   │   └── ui/MarkdownEditor.tsx # Markdown 编辑器
│   │   ├── lib/
│   │   │   ├── api/client.ts         # API 客户端
│   │   │   └── store/appStore.ts     # Zustand 状态管理
│   │   ├── styles/globals.css        # 全局样式
│   │   └── types/index.ts             # TypeScript 类型定义
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
└── README.md
```

## 部署

### Docker 部署（推荐）

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5001/api

volumes:
  mongo_data:
```

### Vercel 部署前端

1. 将代码推送到 GitHub
2. 在 Vercel 导入仓库
3. 配置环境变量 `NEXT_PUBLIC_API_URL`
4. 点击 Deploy

## 开发说明

### 添加新的大模型支持

在 `backend/app/services/llm_service.py` 中扩展 `LLMService._get_llm()` 方法：

```python
elif self.provider == 'new-provider':
    # 添加新供应商的 LLM 初始化代码
    pass
```

### 添加新的平台格式

在 `backend/app/routes/format.py` 中扩展 `platform_rules` 字典和前端平台列表。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
