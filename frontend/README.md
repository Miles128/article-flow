# Article Flow 前端

Next.js 14（App Router）+ React 18 + TypeScript + Tauri 2 桌面壳。

## 开发

```bash
npm install
npm run dev          # Web：http://localhost:3000，API 经 next.config 代理到 :5001
npm run tauri:dev    # 桌面版（需先启动后端）
```

## 环境变量

见 `.env.example`。Tauri 构建时设置 `NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api`。

## 结构

- `src/app/` — 页面路由（项目工作流各步骤）
- `src/lib/api/client.ts` — Axios 客户端（自动 snake/camel 转换）
- `src/lib/store/appStore.ts` — 全局状态与工作流配置
- `src/components/` — UI 与布局组件
