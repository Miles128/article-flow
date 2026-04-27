# Article Flow

基于 SvelteKit 构建的文章写作工作流应用，提供 12 步标准化写作流程，支持 AI 味检测、多种工作区类型、断点保存等功能。

## 功能特性

### 12 步工作流

| 步骤 | 名称 | 说明 | 断点 |
|------|------|------|------|
| 0 | 创建项目 | 选择工作区类型，设置项目基本信息 | |
| 1 | 需求规格 | 定义文章目标受众、核心观点、字数要求 | |
| 2 | 信息调研 | 收集相关资料、案例、数据支撑 | |
| 3 | 确定选题 | 选择最终文章标题和结构大纲 | ✅ |
| 4 | 素材搜索 | 查找案例、数据、引用材料 | |
| 5 | 撰写初稿 | 完成文章主体内容撰写 | ✅ |
| 6 | 内容审校 | 检查事实准确性、逻辑合理性 | |
| 7 | 风格审校 | 统一文风、调整语气、去 AI 味 | |
| 8 | 细节审校 | 校对错别字、标点、格式 | |
| 9 | 配图建议 | 选择或生成文章配图 | |
| 10 | 最终检查 | 整体审阅、确认发布准备 | |
| 11 | 发布准备 | 导出文章、准备发布 | |

### 工作区类型

| 类型 | 说明 | 特点 |
|------|------|------|
| 公众号 | 适合微信公众号文章 | 段落≤150 字，对话式风格 |
| 视频脚本 | 适合视频旁白和字幕 | 高度口语化，段落≤80 字 |
| 通用写作 | 标准文章格式 | 段落≤300 字，正式风格 |

### AI 味检测

自动检测文章的 AI 痕迹，从三个维度分析：

- **连接词比率**：检测"然而、但是、当然"等过渡词的过度使用
- **套话占比**：检测"总而言之、综上所述、值得一提的是"等套话
- **句长标准差**：检测句式是否过于统一，缺乏节奏感

目标：AI 味 < 30%

### 编辑器

- **所见即所得模式**：基于 Tipex (TipTap) 的富文本编辑
- **Markdown 双栏模式**：左侧编辑源码，右侧实时预览
- **自动保存**：输入停止 2 秒后自动保存

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | SvelteKit | 2.x |
| 语言 | TypeScript | 6.x |
| 样式 | Tailwind CSS | 4.x |
| 编辑器 | Tipex (TipTap) | 0.1.x |
| 数据库 | SQLite + Drizzle ORM | 0.45.x |
| 图标 | Lucide Svelte | 1.x |

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x

### 安装

```bash
cd frontend
npm install
```

### 数据库初始化

```bash
npm run db:push
```

### 开发

```bash
npm run dev
```

访问 http://localhost:5173

### 构建

```bash
npm run build
npm run preview
```

## 项目结构

```
Article-Flow/
├── frontend/                     # SvelteKit 前端应用
│   ├── src/
│   │   ├── lib/
│   │   │   ├── aiTaste.ts       # AI 味检测逻辑
│   │   │   ├── workflow.ts      # 工作流定义
│   │   │   ├── store.ts         # 状态管理
│   │   │   └── server/
│   │   │       └── db/
│   │   │           ├── index.ts # 数据库连接
│   │   │           └── schema.ts # 数据模型
│   │   └── routes/
│   │       ├── +page.svelte     # 项目列表页
│   │       ├── +layout.svelte
│   │       ├── api/
│   │       │   └── projects/    # 项目 API
│   │       └── projects/
│   │           └── [id]/
│   │               ├── +page.svelte # 项目编辑页
│   │               └── +page.server.ts
│   ├── README.md
│   └── package.json
├── doc/                          # 文档
│   └── workflow-visualization-scheme.md
└── README.md
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |
| GET | `/api/projects/:id/contents` | 获取项目内容 |
| POST | `/api/projects/:id/contents` | 保存项目内容 |

## 部署

### Vercel

1. 将项目推送到 GitHub
2. 在 Vercel 导入仓库
3. 点击 Deploy

### 本地打包

```bash
cd frontend
npm run build
```

构建产物在 `build/` 目录。

## 已知问题

- Svelte 5 runes 模式：使用 `$props()` 而非 `export let`

## 许可证

MIT
