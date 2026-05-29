"""风格转换 / 润色 内置提示词（风格目录来自 config/writing_styles.yaml）"""
from __future__ import annotations

from ..article_format import get_article_format_prompt
from ..config_loader import get_writing_style_catalog
from .writing_style_intensity import (
    format_style_prompt,
    get_destylize_instruction,
    get_style_meta,
    parse_style_intensity_from_data,
)


def get_style_whitelist() -> dict[str, str]:
    """style id → 默认浓度下的 prompt（兼容旧调用）。"""
    raw = get_writing_style_catalog().get('styles') or {}
    return {
        sid: format_style_prompt(sid, None)
        for sid in raw
    }


def style_prompt_for_request(style_id: str, data: dict | None = None) -> str:
    intensity = parse_style_intensity_from_data(data or {}) if data else None
    desc = format_style_prompt(style_id, intensity)
    if not desc:
        keys = list((get_writing_style_catalog().get('styles') or {}).keys())
        raise ValueError(
            f'不支持的风格类型: {style_id}。可选: {", ".join(sorted(keys))}'
        )
    return desc


def rewrite_style_messages(
    body: str,
    style: str,
    *,
    intensity: int | None = None,
    restore_plain: bool = False,
) -> list[tuple[str, str]]:
    style_desc = format_style_prompt(style, intensity)
    if not style_desc:
        meta = get_style_meta(style)
        if not meta:
            raise ValueError(f'不支持的风格类型: {style}')
    from .writing_quality import get_readability_writing_rules

    destylize = get_destylize_instruction(style, force=restore_plain)
    destylize_block = f'\n\n{destylize}' if destylize else ''

    return [
        (
            'system',
            '你是文体改写专家。改写后全文须通顺可读，再体现目标风格。'
            '禁止只做同义词替换；禁止留下半截句或语法残缺。',
        ),
        (
            'user',
            f'''【目标风格】{style_desc}{destylize_block}

【原文】
{body}

【硬性要求】
1. 通顺第一：完整句、自然衔接，禁止碎句连缀
2. 保留全部事实、数据、论点顺序；不得删减关键信息
3. 仅保留 # 主标题与 **加粗**、列表；禁止 ## / ###；不要添加或修改文章主标题
4. 只输出改写后的正文，不要解释、不要前言
5. 禁止「在当今/随着/值得注意的是/综上所述/显著提升」等 AI 套话

{get_article_format_prompt()}
{get_readability_writing_rules()}''',
        ),
    ]
