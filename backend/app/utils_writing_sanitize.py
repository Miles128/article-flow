"""成稿后清理：去掉模型误写的字数/结构元信息"""
from __future__ import annotations

import re

# 独立成行且像「写作说明」而非正文数据
_META_LINE = re.compile(
    r'^[\s\*#]*(?:全文|本文|文章|本节|本段|该文)'
    r'(?:[^。\n]{0,24})?(?:共|约|目标|篇幅|统计)?\s*\d+\s*字',
    re.MULTILINE,
)
_META_LINE2 = re.compile(
    r'^[\s\*#]*(?:目标字数|篇幅要求|字数统计|写作要求|按大纲)'
    r'(?:[:：].*)?$',
    re.MULTILINE | re.IGNORECASE,
)
_META_LINE3 = re.compile(
    r'^[\s\*#]*第\s*\d+\s*/\s*\d+\s*节',
    re.MULTILINE,
)


def strip_writing_meta_leakage(text: str) -> str:
    if not (text or '').strip():
        return text or ''
    lines = text.splitlines()
    kept: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            kept.append(line)
            continue
        if _META_LINE.search(stripped):
            continue
        if _META_LINE2.search(stripped):
            continue
        if _META_LINE3.search(stripped):
            continue
        kept.append(line)
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(kept)).strip()


def polish_generated_draft(text: str) -> str:
    """成稿统一后处理：去元信息 + 扁平化 ##/###。"""
    from .utils_outline import flatten_section_headings

    return flatten_section_headings(strip_writing_meta_leakage(text))
