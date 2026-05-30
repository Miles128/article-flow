'use client';

import Link from 'next/link';

const NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'] as const;

const ARTICLE_STEPS = [
  '热搜选题',
  '确定选题',
  '搜集资料',
  '列出大纲',
  '写出草稿',
  '标题工坊',
  '修改审核',
  '格式处理',
  '生成配图',
  '发布准备',
] as const;

const ACTIVE_STEP = 5;

export default function ShuyuanMockPage() {
  return (
    <>
      <div className="sy-banner">
        <span>设计稿 · 书斋墨韵（松烟墨）</span>
        <span aria-hidden>·</span>
        <span>非生产界面，仅供评审</span>
        <Link href="/">返回首页</Link>
      </div>

      <div className="shuyuan-mock">
        <aside className="sy-sidebar" aria-label="工作流册页">
          <div className="sy-brand">
            <div className="flex items-center gap-2.5">
              <span className="sy-brand-mark font-seal" aria-hidden>
                寫
              </span>
              <div>
                <div className="font-kaiti text-lg tracking-[0.2em] text-[var(--sy-ink)]">
                  文流
                </div>
                <div className="text-[10px] text-[var(--sy-ink-faint)] tracking-widest">
                  Article Flow
                </div>
              </div>
            </div>
          </div>

          <div className="sy-project">
            <div className="sy-project-title font-kaiti tracking-wide">
              人工智能将如何重塑内容创作
            </div>
            <div className="sy-project-meta">戊寅稿 · 自媒体长文 · 贰仟字</div>
          </div>

          <nav className="sy-steps">
            {ARTICLE_STEPS.map((name, i) => {
              const id = i + 1;
              const active = id === ACTIVE_STEP;
              return (
                <button
                  key={name}
                  type="button"
                  className={`sy-step font-kaiti${active ? ' sy-step-active' : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="sy-step-num">{NUMERALS[i]}</span>
                  {name}
                </button>
              );
            })}
          </nav>

          <div className="sy-sidebar-foot">已保存 · 辰时三刻</div>
        </aside>

        <main className="sy-main">
          <header className="sy-toolbar">
            <div>
              <h1 className="sy-toolbar-title">写出草稿</h1>
              <p className="sy-toolbar-sub">按节写作 · 去 AI 味 · 风格浓度可调</p>
            </div>

            <div className="sy-toolbar-actions">
              <button type="button" className="sy-btn-seal">
                按大纲写稿
              </button>
              <button type="button" className="sy-btn-seal">
                保存
              </button>
              <button type="button" className="sy-btn">
                续写
              </button>
              <button type="button" className="sy-btn">
                版本
              </button>
              <button type="button" className="sy-btn">
                智能改写
              </button>
              <button type="button" className="sy-btn">
                扩写
              </button>
              <button type="button" className="sy-btn">
                缩写
              </button>
              <button type="button" className="sy-btn">
                润色
              </button>
              <button type="button" className="sy-btn sy-btn-active">
                去AI味
              </button>
              <button type="button" className="sy-btn">
                Playbook
              </button>
              <span className="w-px h-4 bg-[var(--sy-line)] shrink-0" aria-hidden />
              <button type="button" className="sy-btn">
                导入
              </button>
              <button type="button" className="sy-btn">
                导出
              </button>
              <div className="sy-nav-pager shrink-0" aria-label="步骤翻页">
                <button type="button" disabled>
                  上一步
                </button>
                <span className="sy-pager-mark">伍 / 拾</span>
                <button type="button">下一步</button>
              </div>
            </div>
          </header>

          <div className="sy-workspace">
            <div className="sy-editor-wrap">
              <div className="sy-style-bar">
                <label htmlFor="mock-style">文风</label>
                <select id="mock-style" className="sy-select" defaultValue="professional">
                  <option value="professional">正式</option>
                  <option value="poetic">诗意</option>
                  <option value="casual">口语</option>
                </select>
                <label htmlFor="mock-intensity">浓度</label>
                <input
                  id="mock-intensity"
                  type="range"
                  className="sy-slider"
                  min={15}
                  max={85}
                  defaultValue={45}
                />
                <span className="text-[var(--sy-ink-faint)]">45%</span>
                <button type="button" className="sy-btn">
                  恢复正式
                </button>
                <button type="button" className="sy-btn">
                  风格转换
                </button>
              </div>

              <article className="sy-sheet" aria-label="稿纸编辑区">
                <h1>当算法开始替你构思</h1>

                <h2>第一节 问题的起点</h2>
                <p>
                  过去两年，几乎所有内容团队都在问同一个问题：AI
                  究竟是在<strong>放大创作者</strong>
                  ，还是在稀释「人味」。这不是技术乐观或悲观的口号，而是每天都在发生的分工变化——选题会、资料整理、初稿、标题、配图，每一个环节都被重新定价。
                </p>
                <p>
                  若把写作流程拆成「判断」与「表达」，模型更擅长后者中的重复劳动；而前者——什么值得写、写给谁、站在哪条证据链上——仍然高度依赖编辑的品味与责任。工具可以提速，但<strong>不能替代立场</strong>
                  。
                  <span className="sy-cursor" aria-hidden />
                </p>

                <h2>第二节 工作流如何落地</h2>
                <p>
                  一套可用的创作流水线，至少要回答三件事：资料从哪来、章节如何衔接、成稿如何验收。侧栏里的「册页」式步骤，正是把抽象流程钉在纸面上——写完一节，再开下一节，而不是一次性吐出整篇难以收拾的长文。
                </p>

                <p className="sy-wordcount">全文约 1,248 字 · 本节 412 字</p>
              </article>
            </div>

            <aside className="sy-rail" aria-label="辅助面板">
              <div className="sy-panel">
                <div className="sy-panel-title">人味评分</div>
                <div className="flex justify-between text-xs text-[var(--sy-ink-muted)]">
                  <span>AI 味</span>
                  <span className="text-[var(--sy-seal-deep)] font-medium">28</span>
                </div>
                <div className="sy-meter" role="presentation">
                  <div className="sy-meter-fill" />
                </div>
                <p>低于 30 可导出。建议再通读一节衔接处。</p>
              </div>

              <div className="sy-panel">
                <div className="sy-panel-title">分节进度</div>
                <ul className="sy-section-list">
                  <li className="done">
                    <span>问题的起点</span>
                    <span>518</span>
                  </li>
                  <li className="current">
                    <span>工作流如何落地</span>
                    <span>412</span>
                  </li>
                  <li>
                    <span>编辑的边界</span>
                    <span>—</span>
                  </li>
                  <li>
                    <span>结语</span>
                    <span>—</span>
                  </li>
                </ul>
                <button type="button" className="sy-btn sy-btn-seal w-full mt-3 justify-center">
                  续写本节
                </button>
              </div>

              <div className="sy-panel">
                <div className="sy-panel-title">设计说明</div>
                <p>
                  宋体正文 + 楷体标签；直角纸面；朱印主按钮；步骤用「壹贰叁」；预览区对齐「墨香书韵」主题。
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
