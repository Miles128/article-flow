---
name: fix-all-project-issues
overview: 修复 Article-Flow 项目的所有已知问题，包括路由注册、代码错误、配置文件、类型定义等
todos:
  - id: fix-routes-init
    content: 修复 backend/app/routes/__init__.py，补充 content 和 illustration 导入
    status: completed
  - id: fix-writing-import
    content: 修复 backend/app/routes/writing.py，删除第43行重复的 import json
    status: completed
  - id: add-getcategories-api
    content: 前端 hotnewsApi 新增 getCategories 方法，对接后端 /hotnews/categories 路由
    status: completed
    dependencies:
      - fix-routes-init
  - id: refactor-hotnews-page
    content: 重构前端热搜页面，新增类别选择 → 搜索 → 选题挖掘三步流程
    status: completed
    dependencies:
      - add-getcategories-api
  - id: update-env-example
    content: 补充 frontend/.env.example，添加 NEXT_PUBLIC_STREAMING_API_URL 等变量
    status: completed
  - id: check-dead-code
    content: 使用 [subagent:code-explorer] 确认 style_rewrite_service.py 是否被调用，处理死代码
    status: completed
  - id: verify-build
    content: 验证后端启动和前端 lint 通过，确保修复无回归
    status: completed
    dependencies:
      - fix-routes-init
      - fix-writing-import
      - add-getcategories-api
      - refactor-hotnews-page
---

## 产品概述

修复 Article-Flow 项目中存在的代码问题，包括路由导入不完整、重复导入、前后端 API 未对接、环境变量文档缺失等问题。

## 核心功能

1. 修复后端路由 `__init__.py` 导入不完整问题
2. 修复 `writing.py` 重复导入 `json` 问题
3. 前端 `hotnewsApi` 补充 `getCategories` 方法，对接后端已有路由
4. 前端热搜页面重构，实现类别选择 → 搜索结果 → 选题挖掘三步流程
5. 补充 `frontend/.env.example` 环境变量说明
6. 确认 `style_rewrite_service.py` 是否为死代码

## 技术栈

- 后端：Flask + Python
- 前端：Next.js 14 + TypeScript + Tailwind CSS
- 现有架构：Blueprint 路由 + API Client 模式

## 实现方案

### 1. 修复 `backend/app/routes/__init__.py`

**问题**：`create_app()` 注册了 13 个 Blueprint（projects, topics, research, outline, writing, review, format, ai, hotnews, workspace, style, content, illustration），但 `__init__.py` 只导入了前 10 个。

**修复**：在 `__init__.py` 中补充导入：

```python
from . import content as content
from . import illustration as illustration
```

### 2. 修复 `backend/app/routes/writing.py` 重复导入

**问题**：第 2 行 `import json as json_module`，第 43 行又 `import json`。

**修复**：删除第 43 行 `import json`。

### 3. 前端 `hotnewsApi` 补充 `getCategories`

**文件**：`frontend/src/lib/api/client.ts`

在 `hotnewsApi` 对象中新增：

```typescript
getCategories: () => api.get<{ categories: HotNewsCategory[] }>('/hotnews/categories'),
```

### 4. 前端热搜页面重构

**文件**：`frontend/src/app/projects/[id]/hotnews/page.tsx`

当前页面只有 `search` 和 `mining` 两个 view，缺少类别选择。需新增：

1. 新增 `view === "categories"` 状态
2. `useEffect` 中调用 `hotnewsApi.getCategories()` 获取类别列表
3. 类别选择 UI：卡片网格展示 12 个类别（科技/财经/娱乐等）
4. 选择类别后以类别名作为 query 调用搜索
5. 保留现有搜索和选题挖掘功能

### 5. 补充 `frontend/.env.example`

当前内容只有 `NEXT_PUBLIC_API_URL`，需补充：

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_STREAMING_API_URL=http://localhost:5001/api
```

### 6. 确认 `style_rewrite_service.py` 状态

搜索整个后端代码确认是否有调用。若无调用，在文件顶部添加死代码标记注释。

## 目录结构

```
backend/app/routes/__init__.py     [MODIFY] 补充 content, illustration 导入
backend/app/routes/writing.py      [MODIFY] 删除第43行重复 import json
frontend/src/lib/api/client.ts     [MODIFY] hotnewsApi 新增 getCategories 方法
frontend/src/app/projects/[id]/hotnews/page.tsx  [MODIFY] 新增类别选择流程
frontend/.env.example              [MODIFY] 补充环境变量
backend/app/services/style_rewrite_service.py  [MODIFY] 加死代码标记（如确认无用）
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索 `style_rewrite_service.py` 是否被其他文件调用，确认是否为死代码
- Expected outcome: 确认该文件是否有被导入或调用，决定是否需要移除或保留