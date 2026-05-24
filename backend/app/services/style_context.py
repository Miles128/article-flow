"""写作上下文：风格画像注入"""
from typing import Any

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


def merge_writing_context(data: dict[str, Any]) -> dict[str, Any]:
    ctx = dict(data.get('context') or {})
    profile_id = data.get('style_profile_id') or ctx.get('style_profile_id')
    prompt = get_style_prompt(profile_id)
    if prompt:
        existing = ctx.get('style', '')
        ctx['style'] = f'{existing}\n\n{prompt}'.strip() if existing else prompt
    if data.get('anti_ai_rules'):
        ctx['anti_ai_rules'] = (
            '严格遵守去AI味规则：避免「在当今/随着/值得注意的是/综上所述」等套话；'
            '用具体数字和场景替代空洞形容词；段落长短有变化。'
        )
    for key in (
        'section_brief',
        'full_outline',
        'section_index',
        'section_total',
        'prior_sections',
        'research',
    ):
        if key in data and data[key] not in (None, ''):
            ctx[key] = data[key]
    return ctx


def enrich_writing_context_from_project(project_id: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """从项目加载大纲与资料，供按纲写作使用。"""
    from ..models import Outline, ResearchMaterial
    from ..utils_outline import outline_nodes_to_markdown

    out = dict(ctx)
    if not out.get('full_outline'):
        outline = Outline.get_by_project(project_id)
        nodes = outline.get('nodes', []) if outline else []
        if nodes:
            out['full_outline'] = outline_nodes_to_markdown(nodes)
            if outline.get('title'):
                out['outline_title'] = outline['title']

    if not out.get('research'):
        materials = list(ResearchMaterial.get_by_project(project_id))
        if materials:
            parts: list[str] = []
            for i, m in enumerate(materials[:12], 1):
                chunk = f"### 资料{i}: {m.get('title') or '无标题'}"
                if m.get('summary'):
                    chunk += f"\n{m['summary']}"
                elif m.get('content'):
                    body = m['content']
                    chunk += f"\n{body[:800]}{'…' if len(body) > 800 else ''}"
                parts.append(chunk)
            out['research'] = '\n\n'.join(parts)
    return out
