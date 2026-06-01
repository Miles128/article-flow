"""写前 Brief：全文论断 + 洞察 + 分节问题（大纲 + 资料 → 一次生成）"""
from __future__ import annotations

import logging
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..models import Outline
from ..prompts.writing_intent import normalize_writing_intent
from ..services.llm_service import LLMService, _invoke_with_retry
from ..utils import parse_json_from_llm
from ..utils_outline import (
    outline_nodes_to_markdown,
    outline_sections_for_writing,
    truncate_text,
    writing_context_limits,
)
logger = logging.getLogger(__name__)

DEEP_ANALYSIS_SOURCE_TYPE = 'deep_analysis'


def get_writing_brief(project_id: str) -> dict[str, Any] | None:
    outline = Outline.get_by_project(project_id)
    if not outline:
        return None
    brief = outline.get('writing_brief')
    return brief if isinstance(brief, dict) else None


def save_writing_brief(project_id: str, brief: dict[str, Any]) -> dict[str, Any]:
    outline = Outline.get_by_project(project_id)
    title = outline.get('title', '') if outline else ''
    nodes = outline.get('nodes', []) if outline else []
    return Outline.create_or_update(project_id, {
        'title': title,
        'nodes': nodes,
        'writing_brief': brief,
    })


def format_brief_for_prompt(brief: dict[str, Any] | None) -> str:
    if not brief:
        return ''
    parts: list[str] = []
    thesis = (brief.get('thesis') or '').strip()
    if thesis:
        parts.append(f'【全文中心论断】{thesis}')
    insights = brief.get('insights') or []
    if isinstance(insights, list) and insights:
        lines = [f'- {str(x).strip()}' for x in insights[:6] if str(x).strip()]
        if lines:
            parts.append('【核心洞察（须体现，勿写成空话）】\n' + '\n'.join(lines))
    section_q = brief.get('section_questions') or {}
    if isinstance(section_q, dict) and section_q:
        sq_lines: list[str] = []
        for title, q in list(section_q.items())[:14]:
            t = str(title).strip()
            qq = str(q).strip()
            if t and qq:
                sq_lines.append(f'- 「{t}」须回答：{qq}')
        if sq_lines:
            parts.append('【分节必答问题】\n' + '\n'.join(sq_lines))
    forbidden = brief.get('forbidden_cliches') or []
    if isinstance(forbidden, list) and forbidden:
        parts.append(
            '【本文禁用套话】' + '、'.join(str(x).strip() for x in forbidden[:12] if str(x).strip()),
        )
    return '\n\n'.join(parts)


def generate_writing_brief(
    llm: LLMService,
    project_id: str,
    *,
    writing_intent: str | None = None,
) -> dict[str, Any]:
    outline = Outline.get_by_project(project_id)
    if not outline or not outline.get('nodes'):
        raise ValueError('请先在「列出大纲」步骤保存大纲')

    intent = normalize_writing_intent(writing_intent)
    tw = 2000
    nodes = outline.get('nodes') or []
    sections = outline_sections_for_writing(nodes, total_words=tw)
    limits = writing_context_limits(tw)
    outline_md = truncate_text(
        outline_nodes_to_markdown(nodes),
        limits['full_outline_max'],
    )
    from .style_context import enrich_writing_context_from_project

    ctx = enrich_writing_context_from_project(project_id, {'target_word_count': tw})
    research = truncate_text(ctx.get('research') or '', limits['research_max'])
    section_titles = '\n'.join(
        f'- {s.get("title")}' for s in sections if (s.get('title') or '').strip()
    )

    prompt = ChatPromptTemplate.from_messages([
        (
            'system',
            '你是非虚构写作策划编辑。根据大纲与资料提炼写前 Brief，'
            '禁止编造资料中不存在的数据与案例。',
        ),
        (
            'user',
            f'''写作意图：{intent}
文章标题：{outline.get("title") or "（无）"}

【大纲】
{outline_md}

【章节列表】
{section_titles or "（无）"}

【参考资料】
{research or "（无）"}

请返回 JSON（不要 markdown 代码块）：
{{
  "thesis": "全文一句话中心论断",
  "insights": ["洞察1（带判断）", "洞察2", "洞察3"],
  "section_questions": {{"章节标题": "本节必须回答的问题"}},
  "forbidden_cliches": ["本文应避免的套话1", "套话2"]
}}''',
        ),
    ])
    chain = prompt | llm.llm | StrOutputParser()
    raw = _invoke_with_retry(chain, input_vars={})
    parsed = parse_json_from_llm(raw) or {}

    brief: dict[str, Any] = {
        'thesis': str(parsed.get('thesis') or '').strip(),
        'insights': [
            str(x).strip() for x in (parsed.get('insights') or []) if str(x).strip()
        ][:6],
        'section_questions': {},
        'forbidden_cliches': [
            str(x).strip()
            for x in (parsed.get('forbidden_cliches') or [])
            if str(x).strip()
        ][:12],
        'writing_intent': intent,
    }
    sq = parsed.get('section_questions')
    if isinstance(sq, dict):
        brief['section_questions'] = {
            str(k).strip(): str(v).strip()
            for k, v in sq.items()
            if str(k).strip() and str(v).strip()
        }

    save_writing_brief(project_id, brief)
    return brief


def persist_deep_analysis_material(
    project_id: str,
    *,
    topic: str,
    report_markdown: str,
    writing_angles: list[str] | None = None,
) -> dict[str, Any]:
    """深度分析报告写入资料库，供按纲写稿优先引用。"""
    from ..models import ResearchMaterial

    title = f'深度分析：{(topic or "").strip() or "未命名"}'
    summary = (report_markdown or '')[:400]
    keywords = [str(a) for a in (writing_angles or [])[:5] if str(a).strip()]
    existing = ResearchMaterial.get_by_project(project_id)
    for m in existing:
        if m.get('source_type') == DEEP_ANALYSIS_SOURCE_TYPE:
            ResearchMaterial.update(m['_id'], {
                'title': title,
                'content': report_markdown,
                'summary': summary,
                'keywords': keywords,
            })
            updated = ResearchMaterial.get_by_project(project_id)
            for row in updated:
                if row.get('_id') == m['_id']:
                    return row
            return m

    return ResearchMaterial.create(
        project_id,
        DEEP_ANALYSIS_SOURCE_TYPE,
        '',
        title,
        report_markdown,
        summary=summary,
        keywords=keywords,
    )
