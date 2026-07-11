"""写作上下文：风格画像、写作意图、写前 Brief 注入"""
from typing import Any

from ..prompts.writing_intent import parse_writing_intent_from_data
from ..services.anti_ai_service import (
    get_anti_ai_generation_prompt,
    get_anti_ai_polish_prompt,
)
from ..services.writing_brief_service import (
    DEEP_ANALYSIS_SOURCE_TYPE,
    format_brief_for_prompt,
    get_writing_brief,
)
from .style_service import StyleProfile, StyleAnalyzer


def get_style_prompt(style_profile_id: str | None) -> str:
    if not style_profile_id:
        return ''
    profile = StyleProfile.get_by_id(style_profile_id)
    if not profile:
        return ''
    style_data = profile.get('style_data')
    if not style_data:
        return ''
    return StyleAnalyzer.generate_style_prompt(style_data)


def _target_style_from_request(data: dict[str, Any]) -> str:
    """请求体 style + style_intensity → 带浓度说明的风格 prompt。"""
    from ..prompts.writing_style_intensity import (
        format_style_prompt,
        parse_style_intensity_from_data,
    )

    raw = data.get('style') or (data.get('context') or {}).get('style')
    if not raw or not isinstance(raw, str):
        return ''
    key = raw.strip()
    intensity = parse_style_intensity_from_data(data)
    formatted = format_style_prompt(key, intensity)
    if formatted:
        return formatted
    return key if len(key) > 20 else ''


def merge_writing_context(data: dict[str, Any]) -> dict[str, Any]:
    ctx = dict(data.get('context') or {})
    intent = parse_writing_intent_from_data(data)
    ctx['writing_intent'] = intent

    target_style = _target_style_from_request(data)
    if target_style:
        existing = ctx.get('style', '')
        ctx['style'] = (
            f'{target_style}\n\n{existing}'.strip() if existing else target_style
        )
    profile_id = data.get('style_profile_id') or ctx.get('style_profile_id')
    prompt = get_style_prompt(profile_id)
    if prompt:
        existing = ctx.get('style', '')
        ctx['style'] = f'{existing}\n\n{prompt}'.strip() if existing else prompt

    if data.get('anti_ai_rules'):
        if data.get('anti_ai_polish'):
            ctx['anti_ai_rules'] = get_anti_ai_polish_prompt()
        else:
            ctx['anti_ai_rules'] = get_anti_ai_generation_prompt()

    for key in (
        'section_brief',
        'full_outline',
        'section_index',
        'section_total',
        'prior_sections',
        'research',
        'target_word_count',
        'writing_brief_block',
    ):
        if key in data and data[key] not in (None, ''):
            ctx[key] = data[key]

    brief_block = (data.get('writing_brief_block') or ctx.get('writing_brief_block') or '').strip()
    if brief_block:
        ctx['writing_brief_block'] = brief_block

    return ctx


def enrich_writing_context_from_project(project_id: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """从项目加载大纲、资料、写前 Brief，供按纲写作使用。"""
    from ..models import Outline, ResearchMaterial
    from ..utils_outline import (
        outline_nodes_to_markdown,
        outline_sections_for_writing,
        outline_sections_index,
        truncate_text,
        writing_context_limits,
    )

    out = dict(ctx)
    tw = int(out.get('target_word_count') or out.get('target_total_words') or 2000)
    limits = writing_context_limits(tw)

    brief = get_writing_brief(project_id)
    if brief and not out.get('writing_brief_block'):
        out['writing_brief_block'] = format_brief_for_prompt(brief)
    if brief and brief.get('writing_intent') and not out.get('writing_intent'):
        out['writing_intent'] = brief['writing_intent']

    if not out.get('outline_index'):
        outline = Outline.get_by_project(project_id)
        nodes = outline.get('nodes', []) if outline else []
        if nodes:
            sections = outline_sections_for_writing(nodes, total_words=tw)
            out['outline_index'] = truncate_text(
                outline_sections_index(sections),
                limits['outline_index_max'],
            )
            if outline.get('title'):
                out['outline_title'] = outline['title']
    if not out.get('full_outline'):
        outline = Outline.get_by_project(project_id)
        nodes = outline.get('nodes', []) if outline else []
        if nodes:
            md = outline_nodes_to_markdown(nodes)
            out['full_outline'] = truncate_text(md, limits['full_outline_max'])
            if outline.get('title'):
                out['outline_title'] = outline['title']

    if not out.get('research'):
        materials = list(ResearchMaterial.get_by_project(project_id))
        if materials:
            from datetime import datetime

            y = datetime.now().year
            deep = [m for m in materials if m.get('source_type') == DEEP_ANALYSIS_SOURCE_TYPE]
            rest = [m for m in materials if m.get('source_type') != DEEP_ANALYSIS_SOURCE_TYPE]
            ordered = deep + rest
            parts: list[str] = [
                f'（写作年份 {y}；仅可引用下列资料中的事实，勿编造案例；勿把旧闻当年份写「最近」）',
            ]
            for i, m in enumerate(ordered[:12], 1):
                tag = '深度分析' if m.get('source_type') == DEEP_ANALYSIS_SOURCE_TYPE else '资料'
                chunk = f"### {tag}{i}: {m.get('title') or '无标题'}"
                if m.get('summary'):
                    chunk += f"\n{m['summary']}"
                elif m.get('content'):
                    body = m['content']
                    cap = writing_context_limits(tw)['research_max'] // 6
                    chunk += f"\n{body[:cap]}{'…' if len(body) > cap else ''}"
                parts.append(chunk)
            out['research'] = '\n\n'.join(parts)
    return out
