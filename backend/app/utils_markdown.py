"""Markdown 正文工具"""
from __future__ import annotations

import re
from collections.abc import Callable

_TITLE_LINE = re.compile(r'^#\s+\S')


def split_markdown_title(content: str) -> tuple[str, str]:
    """拆分首行一级标题（# 标题）与正文。返回 (title_block, body)。"""
    text = content or ''
    if not text.strip():
        return '', text

    lines = text.splitlines(keepends=True)
    first_idx = next((i for i, line in enumerate(lines) if line.strip()), None)
    if first_idx is None:
        return '', text

    first_line = lines[first_idx].strip()
    if not _TITLE_LINE.match(first_line):
        return '', text

    title_lines = lines[: first_idx + 1]
    rest = lines[first_idx + 1 :]
    while rest and not rest[0].strip():
        title_lines.append(rest.pop(0))

    return ''.join(title_lines), ''.join(rest)


def merge_markdown_title(title_block: str, body: str) -> str:
    title = title_block.rstrip('\n')
    if not title:
        return body
    body = body.lstrip('\n')
    if not body.strip():
        return title
    return f'{title}\n\n{body}'


def transform_preserving_title(content: str, transform: Callable[[str], str]) -> str:
    """只对正文执行 transform，保留文章首行 # 标题不变。"""
    title_block, body = split_markdown_title(content)
    if not title_block:
        return transform(content)
    if not body.strip():
        return content
    return merge_markdown_title(title_block, transform(body))
