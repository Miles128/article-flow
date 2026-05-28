"""风格转换 / 润色 内置提示词（风格目录来自 config/writing_styles.yaml）"""
from __future__ import annotations

from ..article_format import get_article_format_prompt
from ..config_loader import get_writing_style_catalog
from .writing_style_intensity import (
    format_style_prompt,
    get_style_meta,
    parse_style_intensity_from_data,
    resolve_style_intensity,
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
) -> list[tuple[str, str]]:
    style_desc = format_style_prompt(style, intensity)
    if not style_desc:
        meta = get_style_meta(style)
        if not meta:
            raise ValueError(f'不支持的风格类型: {style}')
    from .writing_quality import get_writing_quality_rules

    return [
        (
            'system',
            '你是文体改写专家。任务是把原文改写成指定的「目标风格」，'
            '让读者明显感到语气、用词、句式与原文不同。'
            '禁止只做同义词替换或微调几个词。',
        ),
        (
            'user',
            f'''【目标风格】{style_desc}

【原文】
{body}

【硬性要求】
1. 严格按上方「风格浓度」控制力度：浓度低则轻微点缀即可，浓度高也禁止用力过猛；与原文相比语气应有变化，但不要为风格牺牲清晰度
2. 保留全部事实、数据、论点顺序；不得删减关键信息
3. 仅保留 # 主标题与 **加粗**、列表；禁止 ## / ###；不要添加或修改文章主标题
4. 只输出改写后的正文，不要解释、不要前言
5. 禁止「在当今/随着/值得注意的是/综上所述/显著提升」等 AI 套话

{get_article_format_prompt()}
{get_writing_quality_rules()}''',
        ),
    ]
