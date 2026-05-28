"""
LangChain 多 Agent 按节写作流水线

1. SectionBudgetPlanner — 将全文目标字数（默认 2000）按大纲比例分到各节
2. SectionWriterAgent — 默认串行逐节撰写（携带完整前文衔接上下文）
3. CoherenceAgent — 全文生成后统一润色节间过渡，校验不丢节、不大幅缩字
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..article_format import ensure_article_title
from ..utils_writing_sanitize import polish_generated_draft
from ..utils_outline import (
    extract_single_section_block,
    outline_sections_index,
    strip_overlap_with_prior,
    truncate_text,
    verify_draft_covers_outline,
    writing_context_limits,
)
from ..utils_words import count_article_words
from .anti_ai_service import apply_rule_fixes
from .writing_word_budget import (
    DEFAULT_ARTICLE_WORDS,
    MIN_SECTION_WORDS,
    allocate_section_word_budgets,
    section_word_floor,
)

logger = logging.getLogger(__name__)

MAX_PARALLEL_SECTIONS = 6
COMPLETED_TITLES_MAX = 40

SectionCallback = Callable[[int, str, str], None]
SectionStartCallback = Callable[[int, str], None]


def format_prior_context(
    prior: str,
    completed_titles: list[str],
    *,
    prior_tail_chars: int = 600,
) -> str:
    """前文上下文：已完成章节列表 + 紧邻上文末尾。"""
    parts: list[str] = []
    if completed_titles:
        shown = completed_titles[-COMPLETED_TITLES_MAX:]
        parts.append('已完成章节（勿再写其正文）：' + '、'.join(shown))
        if len(completed_titles) > len(shown):
            parts.append(
                f'（另有前 {len(completed_titles) - len(shown)} 节已写入正文）'
            )
    if prior.strip():
        tail = prior[-prior_tail_chars:] if len(prior) > prior_tail_chars else prior
        parts.append(
            '【衔接】上一节落点（可用 1～2 句承接，勿复制下文）：\n'
            f'{tail}'
        )
    return '\n\n'.join(parts) if parts else '（无）'


class CoherenceAgent:
    """连贯性 Agent：统一人称、过渡与指代，不删减章节。"""

    def __init__(self, llm_service: Any) -> None:
        self._llm = llm_service
        self._chain = (
            ChatPromptTemplate.from_messages([
                (
                    'system',
                    '你是全文连贯性编辑。只润色章节之间的过渡、指代一致性与语气统一。'
                    '禁止删除章节或整段正文，禁止合并或省略章节。'
                    '输出必须保留每一个章节标题（**标题** 形式，逐字一致），禁止新增 ## 行。',
                ),
                (
                    'user',
                    '''【完整大纲】
{outline}

【待润色全文】
{draft}

【风格】
{style}

请输出润色后的完整文章（保留全部章节与关键信息，仅改善衔接）。''',
                ),
            ])
            | llm_service.llm
            | StrOutputParser()
        )

    def polish(
        self,
        draft: str,
        outline_md: str,
        style: str = '',
        *,
        total_words: int = DEFAULT_ARTICLE_WORDS,
    ) -> str:
        from .llm_service import _invoke_with_retry

        return _invoke_with_retry(
            self._chain,
            input_vars={
                'outline': truncate_text(
                    outline_md or '',
                    writing_context_limits(total_words)['full_outline_max'],
                ),
                'draft': draft,
                'style': style or '（默认）',
            },
        )


class SectionWriterAgent:
    """逐节写作 Agent（调用 LLMService.generate_section）。"""

    def __init__(self, llm_service: Any) -> None:
        self._llm = llm_service

    def write_section(
        self,
        title: str,
        section_type: str,
        ctx: dict[str, Any],
        target_words: int,
    ) -> str:
        ctx = {**ctx, 'target_word_count': target_words}
        block = self._llm.generate_section(title, section_type, ctx)
        return apply_rule_fixes(block)['fixed_content']


class WritingOrchestrator:
    """多 Agent 编排：预算 → 逐节写作 → 连贯性润色 → 完整性校验。"""

    def __init__(self, llm_service: Any) -> None:
        self._llm = llm_service
        self._writer = SectionWriterAgent(llm_service)
        self._coherence = CoherenceAgent(llm_service)

    def _write_one_section(
        self,
        idx: int,
        sections: list[dict[str, Any]],
        budgets: list[int],
        ctx_base: dict[str, Any],
        prior: str,
        completed_titles: list[str],
        *,
        target_words: int | None = None,
    ) -> str:
        sec = sections[idx]
        title = sec.get('title', '') or f'第{idx + 1}节'
        total = len(sections)
        limits = writing_context_limits(
            int(ctx_base.get('target_total_words') or ctx_base.get('target_word_count') or DEFAULT_ARTICLE_WORDS)
        )
        prior_ctx = format_prior_context(
            prior,
            completed_titles,
            prior_tail_chars=limits['prior_tail_chars'],
        )
        all_titles = [(s.get('title') or '').strip() for s in sections if (s.get('title') or '').strip()]
        ctx = {
            **ctx_base,
            'prior_sections': prior_ctx,
            'outline_index': truncate_text(
                outline_sections_index(sections),
                limits['outline_index_max'],
            ),
            'section_brief': sec.get('content', ''),
            'section_index': idx + 1,
            'section_total': total,
        }
        target = (
            target_words
            if target_words is not None
            else (budgets[idx] if idx < len(budgets) else MIN_SECTION_WORDS)
        )
        block = self._writer.write_section(
            title,
            sec.get('section_type', 'info'),
            ctx,
            target,
        )
        if not (block or '').strip():
            logger.warning('Empty section block for %s', title)
            return f'**{title}**\n\n（本节生成失败，请在本节重写）'
        wc = count_article_words(block)
        if wc < target * 0.6 and target >= MIN_SECTION_WORDS:
            logger.info(
                'Section %s too short (%d/%d words), retrying',
                title,
                wc,
                target,
            )
            block = self._writer.write_section(
                title,
                sec.get('section_type', 'info'),
                {**ctx, 'target_word_count': target},
                target,
            )
        block = strip_overlap_with_prior(block, prior)
        block = extract_single_section_block(block, title, all_titles)
        return polish_generated_draft(block)

    def _generate_all_sections(
        self,
        sections: list[dict[str, Any]],
        budgets: list[int],
        ctx_base: dict[str, Any],
        *,
        total_words: int = DEFAULT_ARTICLE_WORDS,
        parallel: bool = False,
        on_section: SectionCallback | None = None,
        on_section_start: SectionStartCallback | None = None,
    ) -> list[str]:
        total = len(sections)
        parts: list[str] = []

        if not parallel:
            prior = ''
            completed_titles: list[str] = []
            words_used = 0
            for i in range(total):
                title = sections[i].get('title', '') or f'第{i + 1}节'
                remaining = sections[i:]
                n_rem = len(remaining)
                budget_left = max(0, total_words - words_used)
                floor_total = section_word_floor(total_words, n_rem) * n_rem
                dynamic_budgets = allocate_section_word_budgets(
                    remaining,
                    max(floor_total, budget_left),
                )
                target = dynamic_budgets[0]
                if on_section_start:
                    on_section_start(i, title)
                block = self._write_one_section(
                    i,
                    sections,
                    budgets,
                    ctx_base,
                    prior,
                    completed_titles,
                    target_words=target,
                )
                parts.append(block)
                words_used += count_article_words(block)
                prior = (prior + '\n\n' + block).strip() if prior else block
                completed_titles.append(title)
                if on_section:
                    on_section(i, title, block)
            return parts

        logger.info(
            'Parallel fast-draft (optional): %d sections, %d workers',
            total,
            min(MAX_PARALLEL_SECTIONS, total),
        )
        section_results: dict[int, str] = {}

        def _task(idx: int) -> tuple[int, str]:
            block = self._write_one_section(idx, sections, budgets, ctx_base, '', [])
            title = sections[idx].get('title', '') or f'第{idx + 1}节'
            return idx, title, block

        with ThreadPoolExecutor(max_workers=min(MAX_PARALLEL_SECTIONS, total)) as pool:
            futures = {pool.submit(_task, i): i for i in range(total)}
            for fut in as_completed(futures):
                idx, title, block = fut.result()
                section_results[idx] = block
                if on_section:
                    on_section(idx, title, block)

        return [section_results[i] for i in range(total) if i in section_results]

    def _finalize_draft(
        self,
        parts: list[str],
        sections: list[dict[str, Any]],
        budgets: list[int],
        ctx_base: dict[str, Any],
        *,
        total_words: int,
        article_title: str,
        outline_md: str,
        parallel: bool,
        skip_coherence: bool = False,
    ) -> dict[str, Any]:
        full = polish_generated_draft('\n\n'.join(parts))
        before_words = count_article_words(full)
        style = str(ctx_base.get('style', '') or '')
        coherence_applied = False

        if skip_coherence:
            full = ensure_article_title(full, article_title)
            missing = verify_draft_covers_outline(full, sections)
            agents = ['section_budget_planner', 'section_writer']
            if parallel:
                agents.append('parallel_writer')
            section_meta = [
                {
                    'title': sections[i].get('title', ''),
                    'target_word_count': budgets[i] if i < len(budgets) else 0,
                    'actual_word_count': count_article_words(parts[i])
                    if i < len(parts)
                    else 0,
                }
                for i in range(len(sections))
            ]
            return {
                'content': full,
                'section_count': len(sections),
                'missing_sections': missing,
                'outline_following': len(missing) == 0,
                'total_word_count': count_article_words(full),
                'target_total_words': total_words,
                'section_word_targets': section_meta,
                'agents_used': agents,
                'coherence_applied': False,
                'writing_mode': 'parallel' if parallel else 'sequential',
            }

        try:
            polished = self._coherence.polish(
                full,
                outline_md,
                style,
                total_words=total_words,
            )
            polished = apply_rule_fixes(polished)['fixed_content']
            after_words = count_article_words(polished)
            missing_after = verify_draft_covers_outline(polished, sections)
            if not missing_after and after_words >= int(before_words * 0.85):
                full = polished
                coherence_applied = True
            else:
                logger.info(
                    'Coherence pass skipped: missing=%s words %s→%s',
                    missing_after,
                    before_words,
                    after_words,
                )
        except Exception as e:
            logger.warning('Coherence agent failed, using raw draft: %s', e)

        full = ensure_article_title(full, article_title)
        missing = verify_draft_covers_outline(full, sections)

        agents = ['section_budget_planner', 'section_writer', 'coherence']
        if parallel:
            agents.append('parallel_writer')

        section_meta = [
            {
                'title': sections[i].get('title', ''),
                'target_word_count': budgets[i] if i < len(budgets) else 0,
                'actual_word_count': count_article_words(parts[i])
                if i < len(parts)
                else 0,
            }
            for i in range(len(sections))
        ]

        return {
            'content': full,
            'section_count': len(sections),
            'missing_sections': missing,
            'outline_following': len(missing) == 0,
            'total_word_count': count_article_words(full),
            'target_total_words': total_words,
            'section_word_targets': section_meta,
            'agents_used': agents,
            'coherence_applied': coherence_applied,
            'writing_mode': 'parallel' if parallel else 'sequential',
        }

    def run_fast_draft_stream(
        self,
        sections: list[dict[str, Any]],
        ctx_base: dict[str, Any],
        *,
        total_words: int = DEFAULT_ARTICLE_WORDS,
        article_title: str = '',
        outline_md: str = '',
        on_section: SectionCallback | None = None,
        on_section_start: SectionStartCallback | None = None,
        parallel: bool = False,
    ) -> dict[str, Any]:
        ctx_base = {**ctx_base, 'target_total_words': total_words, 'target_word_count': total_words}
        budgets = allocate_section_word_budgets(sections, total_words)
        parts = self._generate_all_sections(
            sections,
            budgets,
            ctx_base,
            total_words=total_words,
            parallel=parallel,
            on_section=on_section,
            on_section_start=on_section_start,
        )
        return self._finalize_draft(
            parts,
            sections,
            budgets,
            ctx_base,
            total_words=total_words,
            article_title=article_title,
            outline_md=outline_md,
            parallel=parallel,
            skip_coherence=True,
        )

    def run_fast_draft(
        self,
        sections: list[dict[str, Any]],
        ctx_base: dict[str, Any],
        *,
        total_words: int = DEFAULT_ARTICLE_WORDS,
        article_title: str = '',
        outline_md: str = '',
        parallel: bool = False,
    ) -> dict[str, Any]:
        ctx_base = {**ctx_base, 'target_total_words': total_words, 'target_word_count': total_words}
        budgets = allocate_section_word_budgets(sections, total_words)
        parts = self._generate_all_sections(
            sections,
            budgets,
            ctx_base,
            total_words=total_words,
            parallel=parallel,
            on_section=None,
        )
        return self._finalize_draft(
            parts,
            sections,
            budgets,
            ctx_base,
            total_words=total_words,
            article_title=article_title,
            outline_md=outline_md,
            parallel=parallel,
        )
