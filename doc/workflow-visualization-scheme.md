# 文章写作工作流可视化方案

> 版本：v1.0  
> 日期：2026-04-27  
> 状态：设计稿

---

## 目录

- [一、整体架构](#一整体架构)
- [二、12 步工作流详情](#二12-步工作流详情)
- [三、断点保存机制](#三断点保存机制)
- [四、工作区前置设计](#四工作区前置设计)
- [五、前端页面设计](#五前端页面设计)
- [六、后端 API 设计](#六后端-api-设计)
- [七、技术栈选型](#七技术栈选型)

---

## 一、整体架构

### 1.1 核心设计原则

| 原则 | 说明 |
|------|------|
| **步骤统一** | 所有文章类型共用一套 12 步流程，前后退导航 |
| **工作区前置** | 创建项目时一次性选择工作区，后续自动应用规则 |
| **断点保存** | 关键步骤后触发断点保存，生成可恢复的草稿 |
| **实时提示** | 每步根据工作区规则显示实时约束和提醒 |

### 1.2 全局流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         文章写作工作流 v2.0                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐                                                         │
│  │  0 创建项目  │ ◀── 选择工作区、输入主题、确定目标                       │
│  └──────┬──────┘                                                         │
│         │                                                                  │
│         ▼                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │  1 需求规格  │ ──▶ │  2 信息调研  │ ──▶ │  3 确定选题  │               │
│  │  (specify)  │     │  (research) │     │  (topic)    │               │
│  └─────────────┘     └─────────────┘     └──────┬──────┘               │
│                                                    │                       │
│                    ┌──────────────────────────────┘                       │
│                    ▼                                                         │
│         ┌───────────────────────┐                                           │
│         │ 【断点 1】选题规格保存 │ ──▶ specification.md                     │
│         └───────────┬───────────┘                                           │
│                     │                                                        │
│                     ▼                                                        │
│  ┌─────────────┐     ┌─────────────┐                                       │
│  │  4 素材搜索  │ ──▶ │  5 撰写初稿  │                                       │
│  │  (collect)  │     │  (write)    │                                       │
│  │   (可跳过)   │     └──────┬──────┘                                       │
│  └─────────────┘            │                                                │
│                             │                                                │
│              ┌──────────────┘                                                │
│              ▼                                                                 │
│     ┌───────────────────────┐                                                │
│     │ 【断点 2】初稿保存     │ ──▶ draft.md                                  │
│     └───────────┬───────────┘                                                │
│                 │                                                             │
│                 ▼                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │  6 内容审校  │ ──▶ │  7 风格审校  │ ──▶ │  8 细节审校  │                  │
│  │(review-c)   │     │(review-s)   │     │(review-d)   │                  │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                  │
│                                                    │                          │
│              ┌─────────────────────────────────────┘                          │
│              │                                                                   │
│              ▼                                                                   │
│     ┌───────────────────────┐                                                   │
│     │ 【持续更新】草稿更新   │ ──▶ draft.md + audit-log.md                     │
│     └───────────┬───────────┘                                                   │
│                 │                                                                │
│                 ▼                                                                │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │  9 配图建议  │ ──▶ │  10 最终检查 │ ──▶ │  11 发布准备 │                    │
│  │  (images)   │     │  (check)    │     │  (publish)  │                    │
│  │   (可跳过)   │     └─────────────┘     └─────────────┘                    │
│  └─────────────┘                                                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 导航交互模式

```
┌──────────────────────────────────────────────────────────────────┐
│                      步骤导航栏（全局顶部）                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [← 上一步]              步骤 5 / 12              [下一步 →]     │
│                                                                  │
│  ──○────○────○────●────○────○────○────○────○────○────○────○──  │
│    0    1    2    3    4    5    6    7    8    9   10   11   │
│   创建 规格 调研 选题 素材 初稿 审校 审校 审校 配图 检查 发布     │
│   完成 完成 完成 进行中 待开始                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**交互规则：**
- **上一步**：总是可用（从第 1 步开始）
- **下一步**：当前步骤完成后可用
- **跳转**：点击已完成的步骤圆点可跳转（需确认是否保存当前输入）
- **灰色圆点**：未完成且不可跳转

---

## 二、12 步工作流详情

### 2.1 步骤 0：创建项目

**目标**：初始化文章项目，确定工作区类型和基础信息

**输入项：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 工作区类型 | 单选 | ✅ | 公众号 / 视频脚本 / 通用写作 |
| 文章主题 | 文本 | ✅ | 一句话描述核心主题 |
| 目标字数 | 数字 | 可选 | 默认根据工作区推荐 |
| 发布平台 | 多选 | 可选 | 影响输出格式 |

**工作区选择卡片：**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   📱 公众号      │  │   🎥 视频脚本    │  │   📄 通用写作    │
│                 │  │                 │  │                 │
│  段落 ≤ 150 字   │  │  高度口语化      │  │  灵活配置        │
│  AI味 < 30%     │  │  AI味 < 20%     │  │  AI味 < 30%     │
│  需封面图        │  │  前3秒 Hook     │  │  无特殊限制      │
│                 │  │                 │  │                 │
│    [ 选择 ]     │  │    [ 选择 ]     │  │    [ 选择 ]     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**输出：**
- 项目 ID（自动生成：`{编号}-{主题缩写}`）
- 项目目录创建
- 初始状态文件 `.state.json`

---

### 2.2 步骤 1：需求规格 (specify)

**目标**：明确写作需求，生成结构化 brief

**输入项：**

| 模块 | 内容 |
|------|------|
| 核心主题 | 一句话主题扩展 |
| 目标读者 | 主要读者 + 次要读者 + 读者痛点 |
| 内容类型 | 评测 / 教程 / 观点 / 案例研究 |
| 字数要求 | 目标字数 + 可接受范围 |
| 必须包含 | P0 级必填内容清单 |
| 风格基调 | 客观 / 主观 / 专业 / 轻松 |
| 数据要求 | 是否需要真实测试 / 信息调研 |

**工作区自动填充规则：**

| 工作区 | 自动填充项 |
|--------|-----------|
| 公众号 | 段落 ≤ 150 字、敏感词检查、封面图必需 |
| 视频脚本 | 口语化、分镜标注、Hook 设计提示 |
| 通用 | 无特殊约束 |

**输出：**
- `brief.md` - 需求规格文档

---

### 2.3 步骤 2：信息调研 (research)

**目标**：收集写作所需的背景资料和数据

**功能模块：**

| 模块 | 功能 |
|------|------|
| 官方文档搜索 | 根据主题关键词搜索官方技术文档 |
| 用户评价收集 | 搜索社交媒体、评测网站的用户反馈 |
| 竞品信息汇总 | 对比产品的参数、价格、功能列表 |
| 技术数据整理 | 性能指标、版本信息、发布时间线 |

**输出：**
- `materials/research-*.md` - 调研报告（可选，不强制断点）

---

### 2.4 步骤 3：确定选题 (topic)

**目标**：确定文章角度、结构框架、核心观点

**输入项：**

| 模块 | 内容 |
|------|------|
| 选题方向 | 从多个角度选择（技术深度 / 用户体验 / 对比评测） |
| 文章结构 | 开头方式 / 正文段落划分 / 结尾设计 |
| 核心观点 | 本文要传递的 3-5 个核心论点 |
| 案例素材 | 需要哪些真实案例或数据支撑 |
| 配图规划 | 封面图 + 正文插图需求 |

**【断点 1】触发保存：**

```
┌─────────────────────────────────────────┐
│           保存选题规格？                  │
├─────────────────────────────────────────┤
│                                         │
│  选题已确定，是否保存为规格草稿？          │
│                                         │
│  📄 文件: specification.md               │
│                                         │
│  内容摘要:                               │
│  • 选题方向: 深度评测对比                │
│  • 文章结构: 5 段落 + 总结推荐           │
│  • 核心观点: 3 个主要论点                │
│  • 配图需求: 封面图 + 3 张对比图         │
│                                         │
├─────────────────────────────────────────┤
│      [取消]         [确认保存]           │
└─────────────────────────────────────────┘
```

**输出（断点 1）：**
- `specification.md` - 选题规格文档（可恢复）

---

### 2.5 步骤 4：素材搜索 (collect)

**目标**：搜索个人素材库中的可用经历和案例

**功能：**
- 关键词搜索个人知识库
- 匹配相关经历、案例、数据
- 标注可用素材的位置和可信度

**可跳过条件：**
- 无需个人经历支撑
- 已在调研阶段收集足够素材

**输出：**
- `materials-found.md` - 素材清单（可选）

---

### 2.6 步骤 5：撰写初稿 (write)

**目标**：基于规格和素材，完成文章初稿

**编辑器界面：**

```
┌────────────────────────────────────────────────────────────┐
│  📝 撰写初稿                              [自动保存: 2秒前] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  # DeepSeek V4 Pro 深度评测                         │  │
│  │                                                      │  │
│  │  ## 引言                                             │  │
│  │                                                      │  │
│  │  [在此输入正文...]                                   │  │
│  │                                                      │  │
│  │  (光标位置)                                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ 📊 实时统计       │  │ ⚠️ 工作区规则提醒             │ │
│  │                  │  │                              │ │
│  │ 字数: 1,245      │  │ 当前段落: 142 / 150 字      │ │
│  │ 目标: 3,000      │  │ ⚠️ 建议拆分                  │ │
│  │ 进度: 42%        │  │                              │ │
│  │                  │  │ AI味目标: < 30%              │ │
│  │ [████████░░░░]   │  │                              │ │
│  └──────────────────┘  └──────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**写作模式：**
- **快速模式**：AI 一次性生成初稿
- **教练模式**：分段落引导，人工参与更多
- **混合模式**：AI 生成 + 人工编辑

**【断点 2】触发保存：**

```
┌─────────────────────────────────────────┐
│           保存初稿草稿？                  │
├─────────────────────────────────────────┤
│                                         │
│  初稿撰写完成，是否保存为草稿？            │
│                                         │
│  📄 文件: draft.md                      │
│                                         │
│  统计:                                   │
│  • 字数: 2,845 / 3,000                 │
│  • 段落: 12 段                          │
│  • 平均段落长度: 237 字                 │
│                                         │
│  ⚠️ 有 3 段超过 150 字，建议审校时拆分    │
│                                         │
├─────────────────────────────────────────┤
│      [取消]         [确认保存]           │
└─────────────────────────────────────────┘
```

**输出（断点 2）：**
- `draft.md` - 文章草稿（可恢复、可持续更新）

---

### 2.7 步骤 6-8：三遍审校

**统一设计：**

| 步骤 | 名称 | 核心关注点 |
|------|------|-----------|
| 步骤 6 | 内容审校 | 事实准确性、逻辑连贯性、结构完整性 |
| 步骤 7 | 风格审校 | AI 味降低、口语化增强、个性化融入 |
| 步骤 8 | 细节审校 | 标点规范、排版格式、错别字检查 |

**审校界面：**

```
┌────────────────────────────────────────────────────────────┐
│  📋 内容审校 (第 1/3 遍)                      [ 完成并继续 ] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  左侧：原文预览                      右侧：审校建议列表        │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │ 第 3 段:             │         │ 📝 问题 1 / 5         │ │
│  │                      │         │                      │ │
│  │ "随着人工智能技术的   │         │ 🔴 事实错误            │ │
│  │ 飞速发展..."         │         │                      │ │
│  │                      │         │ 原文: "GPT-4 于 2022  │ │
│  │ 第 7 段:             │         │ 年发布"               │ │
│  │                      │         │                      │ │
│  │ "在当今数字化时代的   │         │ 建议: 改为 2023 年 3  │ │
│  │ 背景下..."           │         │ 月发布                 │ │
│  │                      │         │                      │ │
│  └──────────────────────┘         │ [忽略]  [应用修改]    │ │
│                                    └──────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📊 AI 味检测报告                                      │  │
│  │                                                      │  │
│  │ 连接词比率:  3.2%  ──────────────▶ 正常            │  │
│  │ 套话占比:   15.8% ──────────────▶ ⚠️ 偏高          │  │
│  │ 句长标准差: 8.5   ──────────────▶ ✅ 变化丰富      │  │
│  │                                                      │  │
│  │ 总体评分: 28% ✅ (目标 < 30%)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**审校完成后：**
- 更新 `draft.md`（应用修改）
- 追加 `audit-log.md`（记录审校历史）

**快捷操作：**
- **连续审校**：一键执行三遍审校（自动流转）

---

### 2.8 步骤 9：配图建议 (images)

**目标**：生成配图方案，标注需要配图的位置

**功能：**
- 分析文章结构，推荐配图位置
- 生成配图描述（用于 AI 生成或设计师参考）
- 标注图片尺寸要求（封面图 / 正文插图）

**可跳过条件：**
- 纯文字文章
- 后续手动处理配图

**输出：**
- `images-plan.md` - 配图方案（可选）

---

### 2.9 步骤 10：最终检查 (check)

**目标**：全面检查，确保文章质量

**检查清单：**

| 检查项 | 状态 |
|--------|------|
| 字数达标 | ✅ 2,987 / 3,000 |
| 段落长度 | ⚠️ 2 段超过 150 字 |
| AI 味检测 | ✅ 22% < 30% |
| 敏感词检查 | ✅ 未发现 |
| 标点规范 | ✅ 已统一 |
| 错别字检查 | ✅ 未发现 |

**输出：**
- 最终检查报告
- 可进入发布阶段

---

### 2.10 步骤 11：发布准备 (publish)

**目标**：生成各平台所需的输出格式

**功能：**
- 根据工作区类型导出对应格式
- 支持多平台导出

| 工作区 | 导出格式 |
|--------|----------|
| 公众号 | Markdown、HTML、秀米、135 编辑器 |
| 视频脚本 | Markdown、PDF、分镜脚本格式 |
| 通用 | Markdown、HTML |

**输出：**
- `publish/` 目录下的各平台文件

---

## 三、断点保存机制

### 3.1 断点定义

```
┌─────────────────────────────────────────────────────────────┐
│                      断点保存策略                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  【断点 1】确定选题后 (步骤 3 → 步骤 4)                      │
│  ├── 触发时机: 点击「下一步」或手动保存                        │
│  ├── 保存内容: specification.md                              │
│  └── 恢复点: 可从规格直接进入写作，无需重走选题               │
│                                                              │
│  【断点 2】撰写初稿后 (步骤 5 → 步骤 6)                      │
│  ├── 触发时机: 点击「下一步」或手动保存                        │
│  ├── 保存内容: draft.md                                      │
│  └── 恢复点: 可直接进入审校，或继续编辑草稿                   │
│                                                              │
│  【持续更新】审校阶段 (步骤 6-8)                              │
│  ├── 触发时机: 每遍审校完成                                    │
│  ├── 保存内容: draft.md (更新) + audit-log.md (追加)        │
│  └── 恢复点: 可继续下一遍审校，或回退到上一遍                 │
│                                                              │
│  【自动保存】所有步骤                                          │
│  ├── 触发时机: 输入停止 2 秒后、页面离开前                     │
│  ├── 保存位置: localStorage (前端) + 临时文件 (后端)          │
│  └── 恢复点: 重新打开时询问「恢复未保存内容？」                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 状态文件结构

```
projects/
└── {project-id}/
    ├── .state.json           # 项目状态（核心）
    │   ├── project_id: "001-deepseek-eval"
    │   ├── workspace: "wechat"
    │   ├── current_step: 5
    │   ├── total_steps: 12
    │   ├── created_at: "2026-04-26T20:55:17Z"
    │   ├── updated_at: "2026-04-27T10:30:00Z"
    │   ├── breakpoints: {
    │       "specification": true,   # 是否已保存规格
    │       "draft": true            # 是否已保存初稿
    │   }
    │   └── autosave: {
    │       "step_5_content": "...", # 第 5 步的自动保存内容
    │       "saved_at": "2026-04-27T10:30:00Z"
    │   }
    │
    ├── brief.md              # 需求规格
    ├── specification.md      # 选题规格（断点 1）
    ├── draft.md              # 文章草稿（断点 2，持续更新）
    ├── audit-log.md          # 审校记录（追加）
    ├── materials/            # 调研素材目录
    │   ├── research-1.md
    │   └── research-2.md
    ├── materials-found.md    # 个人素材清单
    ├── images-plan.md        # 配图方案
    └── publish/              # 发布输出目录
        ├── draft.md
        ├── draft.html
        └── draft-xiumi.html
```

### 3.3 恢复流程

```
用户打开项目
    │
    ▼
检查 .state.json 中的 autosave
    │
    ├── 存在 autosave 且时间 > 断点保存时间
    │       │
    │       ▼
    │   显示恢复提示：
    │   ┌─────────────────────────────────┐
    │   │  检测到未保存的更改               │
    │   │                                 │
    │   │  自动保存于: 2026-04-27 10:30   │
    │   │  当前步骤: 撰写初稿              │
    │   │                                 │
    │   │  [丢弃自动保存]  [恢复内容]      │
    │   └─────────────────────────────────┘
    │
    └── 无 autosave 或用户选择丢弃
            │
            ▼
        从断点文件恢复：
        - 有 draft.md → 恢复到初稿完成状态
        - 有 specification.md → 恢复到选题完成状态
        - 只有 brief.md → 恢复到规格完成状态
```

---

## 四、工作区前置设计

### 4.1 工作区规则定义

```json
{
  "workspaces": {
    "wechat": {
      "name": "公众号写作",
      "description": "微信公众号文章创作",
      "rules": {
        "paragraph_max_chars": 150,
        "ai_taste_target": 0.30,
        "cover_image_required": true,
        "cover_image_size": "900x500",
        "sensitive_word_check": true,
        "chinese_punctuation_only": true
      },
      "default_word_count": {
        "min": 800,
        "target": 2000,
        "max": 3000
      },
      "publish_formats": ["markdown", "html", "xiumi", "editor135"]
    },
    "video": {
      "name": "视频脚本",
      "description": "YouTube/B站等视频脚本",
      "rules": {
        "sentence_max_chars": 30,
        "ai_taste_target": 0.20,
        "hook_required": true,
        "hook_duration_seconds": 3,
        "scene_annotation": true
      },
      "default_word_count": {
        "per_minute": 160,
        "min_minutes": 1,
        "max_minutes": 30
      },
      "publish_formats": ["markdown", "pdf", "storyboard"]
    },
    "general": {
      "name": "通用写作",
      "description": "博客、知乎、Medium等",
      "rules": {
        "ai_taste_target": 0.30,
        "paragraph_max_chars": 500
      },
      "default_word_count": {
        "min": 500,
        "target": 1500,
        "max": 5000
      },
      "publish_formats": ["markdown", "html"]
    }
  }
}
```

### 4.2 工作区规则应用时机

| 时机 | 应用方式 |
|------|----------|
| **创建项目时** | 确定 `workspace` 字段，不可更改 |
| **步骤导航时** | 根据工作区显示对应提示和约束 |
| **编辑器中** | 实时检查段落长度、字数统计 |
| **审校阶段** | 自动应用对应 AI 味目标阈值 |
| **发布阶段** | 导出对应平台格式 |

### 4.3 实时提示示例

**公众号写作：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 公众号写作规则提醒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

当前段落: 142 / 150 字 ⚠️
建议: 接近上限，注意控制

段落统计:
  ✅ 10 段符合要求 (< 150 字)
  ⚠️ 2 段超过建议长度
  最长段落: 237 字

AI 味目标: < 30%
当前检测: 22% ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**视频脚本：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎥 视频脚本规则提醒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

句长检查:
  当前句子: 45 字 ⚠️
  建议: 拆分为 2-3 个短句

Hook 设计:
  ⚠️ 前 3 秒 (约 50 字) 未检测到 Hook 元素
  建议: 添加悬念、冲突或直接好处

AI 味目标: < 20%
当前检测: 18% ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 五、前端页面设计

### 5.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│                        应用布局                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  顶部导航栏                                           │   │
│  │  [Logo]  文章写作助手        [项目列表] [设置] [用户] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  步骤导航条（固定）                                    │   │
│  │  [← 上一步]  步骤 5/12  [下一步 →]                   │   │
│  │  ○─○─○─●─○─○─○─○─○─○─○─○                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────┬──────────────────────────────────┐   │
│  │                  │                                  │   │
│  │   侧边栏          │           主内容区                │   │
│  │                  │                                  │   │
│  │  📁 项目结构      │                                  │   │
│  │  ├── brief.md    │      当前步骤的具体内容            │   │
│  │  ├── spec.md     │      （表单、编辑器、预览等）      │   │
│  │  ├── draft.md    │                                  │   │
│  │  └── audit.md    │                                  │   │
│  │                  │                                  │   │
│  │ 📊 状态面板       │                                  │   │
│  │  工作区: 公众号   │                                  │   │
│  │  字数: 1,245     │                                  │   │
│  │  进度: 42%       │                                  │   │
│  │                  │                                  │   │
│  └──────────────────┴──────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 核心页面组件

#### 页面 1：项目列表页

```
┌─────────────────────────────────────────────────────────────┐
│  我的文章项目                              [ + 新建项目 ]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  筛选: [全部] [进行中] [已完成]  排序: [最近更新]           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📱 001 DeepSeek V4 Pro 深度评测    [公众号] [进行中] │   │
│  │                                                       │   │
│  │ 进度: [████████████░░░░] 65%  步骤: 8 / 12          │   │
│  │                                                       │   │
│  │ 字数: 2,845 / 3,000    AI味: 22% ✅                  │   │
│  │                                                       │   │
│  │ 更新: 2小时前    创建: 2026-04-26                    │   │
│  │                                                       │   │
│  │                              [继续编辑] [查看详情]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎥 002 产品介绍视频脚本          [视频脚本] [草稿]    │   │
│  │                                                       │   │
│  │ 进度: [████░░░░░░░░░░] 25%  步骤: 3 / 12           │   │
│  │                                                       │   │
│  │ 时长: 约 3 分钟       Hook: ⚠️ 待设计                │   │
│  │                                                       │   │
│  │ 更新: 1天前      创建: 2026-04-25                    │   │
│  │                                                       │   │
│  │                              [继续编辑] [查看详情]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 页面 2：编辑页（核心）

```
┌─────────────────────────────────────────────────────────────┐
│  [← 返回列表]  001 DeepSeek V4 Pro 深度评测    [公众号]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [← 上一步]              步骤 5 / 12              [下一步 →] │
│                                                              │
│  ○─○─○─●─○─○─○─○─○─○─○─○                                    │
│  0 1 2 3 4 5 6 7 8 9 10 11                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┬────────────────────────────────────────┐ │
│  │  📁 项目文件  │                                        │ │
│  │              │                                        │ │
│  │  brief.md    │         主编辑区域                      │ │
│  │  spec.md     │                                        │ │
│  │  draft.md    │      Markdown 编辑器                    │ │
│  │  audit.md    │      (带实时预览)                       │ │
│  │              │                                        │ │
│  ├──────────────┤                                        │ │
│  │  📊 状态面板  │                                        │ │
│  │              │                                        │ │
│  │  工作区: 公众号 │                                        │ │
│  │  字数: 1,245 │                                        │ │
│  │  进度: 42%   │                                        │ │
│  │              │                                        │ │
│  │  ⚠️ 规则提醒   │                                        │ │
│  │  段落超长     │                                        │ │
│  │              │                                        │ │
│  └──────────────┴────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 状态管理（Zustand）

```typescript
interface WorkspaceConfig {
  type: 'wechat' | 'video' | 'general';
  name: string;
  rules: Record<string, any>;
}

interface ProjectState {
  projectId: string | null;
  workspace: WorkspaceConfig | null;
  currentStep: number;
  totalSteps: number;
  
  files: {
    brief?: string;
    specification?: string;
    draft?: string;
    auditLog?: string;
  };
  
  stats: {
    wordCount: number;
    targetWordCount: number;
    aiTaste: number;
    progress: number;
  };
  
  autosave: {
    step: number;
    content: string;
    savedAt: Date;
  } | null;
  
  // Actions
  initProject: (config: { workspace: string; topic: string }) => Promise<void>;
  goNext: () => Promise<void>;
  goPrev: () => Promise<void>;
  jumpTo: (step: number) => Promise<void>;
  saveDraft: (content: string) => Promise<void>;
  autosaveDraft: (content: string) => void;
}
```

---

## 六、后端 API 设计

### 6.1 核心端点

```
┌─────────────────────────────────────────────────────────────┐
│                      API 端点概览                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  项目管理                                                     │
│  ├── GET    /api/projects          # 项目列表               │
│  ├── POST   /api/projects          # 创建项目（含工作区）    │
│  ├── GET    /api/projects/:id      # 项目详情               │
│  └── DELETE /api/projects/:id      # 删除项目               │
│                                                              │
│  步骤导航                                                     │
│  ├── POST   /api/projects/:id/step/next    # 下一步         │
│  ├── POST   /api/projects/:id/step/prev    # 上一步         │
│  └── POST   /api/projects/:id/step/jump    # 跳转           │
│                                                              │
│  文件操作                                                     │
│  ├── GET    /api/projects/:id/files/:type   # 读取文件      │
│  ├── PUT    /api/projects/:id/files/:type   # 写入文件      │
│  └── POST   /api/projects/:id/autosave       # 自动保存     │
│                                                              │
│  审校功能                                                     │
│  ├── POST   /api/projects/:id/review/:mode   # 执行审校     │
│  ├── GET    /api/projects/:id/review/history  # 审校历史    │
│  └── POST   /api/review/ai-detection          # AI味检测     │
│                                                              │
│  发布功能                                                     │
│  └── POST   /api/projects/:id/publish/:format # 导出格式     │
│                                                              │
│  实时通信 (WebSocket)                                        │
│  └── ws://localhost:8000/ws/projects/:id     # 状态订阅      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 步骤流转逻辑

```python
# backend/services/workflow.py

from typing import Dict, Optional
from enum import IntEnum

class Step(IntEnum):
    CREATE = 0
    SPECIFY = 1
    RESEARCH = 2
    TOPIC = 3
    COLLECT = 4
    WRITE = 5
    REVIEW_CONTENT = 6
    REVIEW_STYLE = 7
    REVIEW_DETAIL = 8
    IMAGES = 9
    CHECK = 10
    PUBLISH = 11

STEP_BREAKPOINTS = {
    Step.TOPIC: 'specification',  # 确定选题后
    Step.WRITE: 'draft',           # 撰写初稿后
}

STEP_NAMES = {
    Step.CREATE: '创建项目',
    Step.SPECIFY: '需求规格',
    Step.RESEARCH: '信息调研',
    Step.TOPIC: '确定选题',
    Step.COLLECT: '素材搜索',
    Step.WRITE: '撰写初稿',
    Step.REVIEW_CONTENT: '内容审校',
    Step.REVIEW_STYLE: '风格审校',
    Step.REVIEW_DETAIL: '细节审校',
    Step.IMAGES: '配图建议',
    Step.CHECK: '最终检查',
    Step.PUBLISH: '发布准备',
}

SKIPPABLE_STEPS = {Step.COLLECT, Step.IMAGES}


class WorkflowService:
    def __init__(self, project_service, file_service, websocket_service):
        self.project_service = project_service
        self.file_service = file_service
        self.websocket_service = websocket_service

    async def go_next(self, project_id: str) -> Dict:
        """执行下一步"""
        project = await self.project_service.get(project_id)
        current_step = project.current_step
        
        # 1. 检查是否是断点步骤（当前步骤的下一步触发保存）
        # 例如：在步骤 3 (TOPIC) 点击下一步 → 触发断点 1
        if current_step in STEP_BREAKPOINTS:
            file_type = STEP_BREAKPOINTS[current_step]
            await self._save_breakpoint(project_id, file_type)
        
        # 2. 更新步骤
        new_step = current_step + 1
        await self.project_service.update(project_id, {
            'current_step': new_step,
            'updated_at': datetime.now()
        })
        
        # 3. 推送状态变更
        await self.websocket_service.broadcast(project_id, {
            'type': 'step_changed',
            'step': new_step,
            'step_name': STEP_NAMES[new_step]
        })
        
        return {
            'success': True,
            'current_step': new_step,
            'step_name': STEP_NAMES[new_step]
        }

    async def go_prev(self, project_id: str) -> Dict:
        """执行上一步"""
        project = await self.project_service.get(project_id)
        current_step = project.current_step
        
        if current_step <= 0:
            raise ValueError("已经是第一步")
        
        new_step = current_step - 1
        await self.project_service.update(project_id, {
            'current_step': new_step
        })
        
        await self.websocket_service.broadcast(project_id, {
            'type': 'step_changed',
            'step': new_step,
            'step_name': STEP_NAMES[new_step]
        })
        
        return {
            'success': True,
            'current_step': new_step,
            'step_name': STEP_NAMES[new_step]
        }

    async def jump_to(self, project_id: str, target_step: int, 
                      save_current: bool = True) -> Dict:
        """跳转到指定步骤"""
        project = await self.project_service.get(project_id)
        current_step = project.current_step
        
        # 验证目标步骤
        if target_step < 0 or target_step >= len(Step):
            raise ValueError(f"无效的步骤: {target_step}")
        
        # 检查是否需要保存当前步骤
        if save_current and current_step in STEP_BREAKPOINTS:
            file_type = STEP_BREAKPOINTS[current_step]
            await self._save_breakpoint(project_id, file_type)
        
        # 更新步骤
        await self.project_service.update(project_id, {
            'current_step': target_step
        })
        
        await self.websocket_service.broadcast(project_id, {
            'type': 'step_jumped',
            'from_step': current_step,
            'to_step': target_step,
            'step_name': STEP_NAMES[target_step]
        })
        
        return {
            'success': True,
            'current_step': target_step,
            'step_name': STEP_NAMES[target_step]
        }

    async def _save_breakpoint(self, project_id: str, file_type: str) -> None:
        """保存断点文件"""
        # 这里需要根据 file_type 保存对应的文件
        # specification.md 或 draft.md
        await self.file_service.save(project_id, file_type)
        
        # 更新项目状态中的断点标记
        await self.project_service.update(project_id, {
            f'breakpoints.{file_type}': True
        })
        
        await self.websocket_service.broadcast(project_id, {
            'type': 'breakpoint_saved',
            'file_type': file_type
        })
```

### 6.3 项目目录结构（后端）

```
article-writer-web/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   │
│   │   ├── routers/
│   │   │   ├── projects.py      # 项目管理路由
│   │   │   ├── workflow.py      # 步骤导航路由
│   │   │   ├── files.py         # 文件操作路由
│   │   │   ├── review.py        # 审校功能路由
│   │   │   ├── publish.py       # 发布功能路由
│   │   │   └── websocket.py     # WebSocket 路由
│   │   │
│   │   ├── services/
│   │   │   ├── project_service.py    # 项目服务
│   │   │   ├── workflow_service.py   # 工作流服务
│   │   │   ├── file_service.py       # 文件服务
│   │   │   ├── review_service.py     # 审校服务
│   │   │   ├── ai_detector.py        # AI味检测
│   │   │   └── websocket_service.py  # WebSocket 服务
│   │   │
│   │   ├── models/
│   │   │   ├── project.py        # 项目数据模型
│   │   │   └── state.py          # 状态模型
│   │   │
│   │   └── schemas/
│   │       ├── project.py        # 请求/响应 schema
│   │       └── workflow.py       # 工作流 schema
│   │
│   ├── scripts/                  # 复用现有 bash 脚本
│   │   ├── common.sh
│   │   ├── write.sh
│   │   └── review.sh
│   │
│   ├── data/                     # 项目数据存储
│   │   └── projects/
│   │       ├── 001-deepseek/
│   │       └── 002-video-script/
│   │
│   └── tests/
│       ├── test_workflow.py
│       └── test_projects.py
│
├── frontend/                     # Next.js 前端
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 项目列表页
│   │   ├── projects/
│   │   │   ├── page.tsx          # 列表
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # 编辑页
│   │   │       └── layout.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── workflow/             # 工作流组件
│   │   │   ├── StepNavigator.tsx
│   │   │   ├── StepProgress.tsx
│   │   │   └── StepContent.tsx
│   │   ├── editor/               # 编辑器组件
│   │   │   ├── MarkdownEditor.tsx
│   │   │   └── Preview.tsx
│   │   ├── review/               # 审校组件
│   │   │   ├── AIDetectionChart.tsx
│   │   │   └── ReviewList.tsx
│   │   └── ui/                   # shadcn/ui 组件
│   │
│   ├── stores/                   # Zustand 状态
│   │   ├── projectStore.ts
│   │   └── workflowStore.ts
│   │
│   ├── hooks/                    # 自定义 hooks
│   │   ├── useAutosave.ts
│   │   └── useWebSocket.ts
│   │
│   └── lib/                      # 工具函数
│       ├── api.ts
│       └── workspaceRules.ts
│
├── docker-compose.yml
└── README.md
```

---

## 七、技术栈选型

### 7.1 推荐方案

| 层级 | 技术选型 | 版本 | 理由 |
|------|----------|------|------|
| **前端框架** | React + Next.js | 18 + 14.2 | App Router 流式渲染、API Routes |
| **UI 组件** | shadcn/ui + Tailwind | latest | 高质量、可定制、轻量 |
| **状态管理** | Zustand | 4.5 | 简单、轻量、TypeScript 友好 |
| **数据请求** | TanStack Query | 5.0 | 缓存、重新验证、乐观更新 |
| **图表可视化** | Recharts | 2.12 | React 生态、中文支持好 |
| **富文本编辑** | TipTap / React-Markdown | latest | Markdown 编辑 + 实时预览 |
| **表单处理** | React Hook Form | 7.51 | 性能好、易于集成 |
| **图标** | Lucide React | latest | 统一风格、按需加载 |

| 层级 | 技术选型 | 版本 | 理由 |
|------|----------|------|------|
| **后端框架** | FastAPI | 0.110 | 异步、类型安全、自动文档 |
| **Python 版本** | Python | 3.11+ | 性能优化、类型提示完善 |
| **CLI 封装** | subprocess + asyncio | - | 执行现有 bash 脚本 |
| **文件监听** | watchdog | latest | 监听文件变更 |
| **实时通信** | WebSocket (fastapi-ws) | latest | 状态实时推送 |
| **数据验证** | Pydantic | 2.x | 类型安全、自动验证 |

| 层级 | 技术选型 | 版本 | 理由 |
|------|----------|------|------|
| **核心存储** | 文件系统 + JSON | - | 兼容现有 CLI 结构 |
| **元数据索引** | SQLite | - | 轻量级、无需额外服务 |
| **缓存** | 文件缓存 + 内存 | - | 减少重复解析 |
| **未来扩展** | PostgreSQL | - | 云端部署时可选 |

### 7.2 前端核心依赖

```json
{
  "name": "article-writer-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next": "^14.2.0",
    
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.28.0",
    
    "recharts": "^2.12.0",
    "lucide-react": "^0.360.0",
    
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "react-syntax-highlighter": "^15.5.0",
    
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.6.0",
    
    "react-hot-toast": "^2.4.0",
    "use-debounce": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### 7.3 后端核心依赖

```toml
[project]
name = "article-writer-backend"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.29.0",
    "pydantic>=2.6.0",
    "pydantic-settings>=2.2.0",
    
    "python-multipart>=0.0.9",
    "aiofiles>=23.2.0",
    "watchdog>=4.0.0",
    
    "websockets>=12.0",
    
    "sqlalchemy>=2.0.0",
    "aiosqlite>=0.19.0",
    
    "python-dateutil>=2.9.0",
    "pathvalidate>=3.2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.1.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
]
```

### 7.3 开发环境

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - ./data:/app/data
    environment:
      - PROJECTS_DIR=/app/data/projects
      - DATABASE_URL=sqlite:///app/data/app.db
```

---

## 附录

### A. 步骤状态流转图

```
┌──────────────────────────────────────────────────────────────────┐
│                        完整状态流转图                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    │
│   │  0   │───▶│  1   │───▶│  2   │───▶│  3   │───▶│  4   │    │
│   │创建  │    │规格  │    │调研  │    │选题  │    │素材  │    │
│   └──────┘    └──────┘    └──────┘    └──┬───┘    └──┬───┘    │
│                                             │           │         │
│                                      [断点1]│           │ [可跳过] │
│                                             ▼           ▼         │
│   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    │
│   │  11  │◀───│  10  │◀───│  9   │◀───│  8   │◀───│  7   │    │
│   │发布  │    │检查  │    │配图  │    │细节  │    │风格  │    │
│   └──────┘    └──────┘    └──┬───┘    └──────┘    └──────┘    │
│                                │                                  │
│                         [可跳过]│                                  │
│                                ▼                                  │
│                           ┌──────┐                               │
│                           │  6   │                               │
│                           │内容  │                               │
│                           └──┬───┘                               │
│                              │                                    │
│                       [断点2]│                                    │
│                              ▼                                    │
│                           ┌──────┐                               │
│                           │  5   │                               │
│                           │初稿  │                               │
│                           └──────┘                               │
│                                                                   │
│   箭头方向: ───▶ 表示下一步                                       │
│            ◀─── 表示上一步                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### B. 断点保存流程图

```
┌──────────────────────────────────────────────────────────────────┐
│                     断点保存触发逻辑                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   用户点击「下一步」                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────┐                                                │
│   │ 当前步骤是？   │                                                │
│   └──────┬───────┘                                                │
│          │                                                        │
│     ┌────┴────┐                                                   │
│     │         │                                                   │
│  步骤 3    其他步骤                                                │
│  步骤 5       │                                                   │
│     │         │                                                   │
│     ▼         ▼                                                   │
│ ┌────────┐ ┌─────────┐                                            │
│ │触发断点 │ │正常流转 │                                            │
│ │保存    │ │        │                                            │
│ └───┬────┘ └────┬────┘                                            │
│     │           │                                                  │
│     ▼           │                                                  │
│ ┌────────────┐  │                                                  │
│ │ 显示保存   │  │                                                  │
│ │ 确认弹窗   │  │                                                  │
│ └─────┬──────┘  │                                                  │
│       │         │                                                  │
│   ┌───┴───┐     │                                                  │
│   │       │     │                                                  │
│ 确认    取消    │                                                  │
│   │       │     │                                                  │
│   ▼       │     │                                                  │
│ ┌──────┐  │     │                                                  │
│ │保存  │  │     │                                                  │
│ │文件  │  │     │                                                  │
│ └──┬───┘  │     │                                                  │
│    │      │     │                                                  │
│    └──────┴─────┤                                                  │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────┐                                                │
│   │ 更新步骤状态  │                                                │
│   │ 推送WebSocket│                                                │
│   └──────────────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   进入下一步                                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### C. 自动保存流程

```
┌──────────────────────────────────────────────────────────────────┐
│                      自动保存机制                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   前端输入框 onChange                                              │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────────┐                                            │
│   │ useDebounce 2秒  │                                            │
│   └─────────┬────────┘                                            │
│             │                                                       │
│             ▼                                                       │
│   ┌──────────────────┐                                            │
│   │ 保存到 localStorage │                                          │
│   │ + 标记时间戳      │                                            │
│   └─────────┬────────┘                                            │
│             │                                                       │
│             ▼                                                       │
│   ┌──────────────────┐                                            │
│   │ 调用后端 API      │                                            │
│   │ POST /autosave   │                                            │
│   └─────────┬────────┘                                            │
│             │                                                       │
│             ▼                                                       │
│   ┌──────────────────┐                                            │
│   │ 后端保存临时文件  │                                            │
│   │ .autosave.json   │                                            │
│   └──────────────────┘                                            │
│                                                                   │
│   ─────────────────────────────────────────────────────────────   │
│                                                                   │
│   页面加载时                                                       │
│          │                                                        │
│          ▼                                                        │
│   ┌──────────────────────┐                                        │
│   │ 检查 localStorage    │                                        │
│   │ + 后端 .autosave     │                                        │
│   └──────────┬───────────┘                                        │
│              │                                                       │
│     ┌────────┴────────┐                                             │
│     │                 │                                             │
│   有自动保存      无自动保存                                          │
│     │                 │                                             │
│     ▼                 │                                             │
│ ┌─────────────┐       │                                             │
│ │ 对比时间戳   │       │                                             │
│ │ 显示恢复提示 │       │                                             │
│ └──────┬──────┘       │                                             │
│        │              │                                             │
│   ┌────┴────┐         │                                             │
│   │         │         │                                             │
│  恢复     丢弃        │                                             │
│   │         │         │                                             │
│   └────┬────┘         │                                             │
│        │              │                                             │
│        └──────────────┴─────────────┐                               │
│                      │                                               │
│                      ▼                                               │
│              从断点文件恢复                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

**文档结束**

*本文档描述了文章写作工作流的可视化方案，包括 12 步统一流程、断点保存机制、工作区前置设计、前后端技术选型等核心内容。*
