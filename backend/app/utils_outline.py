"""大纲工具"""
from __future__ import annotations

import re
from typing import Any

MAX_OUTLINE_H2_SECTIONS = 12


def truncate_text(text: str, max_chars: int) -> str:
    """按字符截断（中文提示词预算用）。"""
    t = (text or '').strip()
    if len(t) <= max_chars:
        return t
    return t[:max_chars].rstrip() + '…'


def writing_context_limits(total_words: int = 2000) -> dict[str, int]:
    """
    按全文目标字数分配「提示词上下文」字符上限（不是成稿字数）。
    2000 字文章典型值：前文衔接 ~600、章节索引 ~330、本节要点 ~400。
    """
    tw = max(500, min(int(total_words), 50000))
    return {
        'prior_tail_chars': min(600, max(180, tw // 3)),
        'outline_index_max': min(350, max(80, tw // 6)),
        'section_brief_max': min(550, max(120, tw // 4)),
        'research_max': min(900, max(200, tw // 2)),
        'full_outline_max': min(1000, max(250, tw // 2)),
    }


def count_top_level_outline_nodes(nodes: list[dict[str, Any]] | None) -> int:
    """顶层节点数 = 文章二级章节数（按大纲写稿的节数）。"""
    return len(nodes or [])


def _merge_children_brief(node: dict[str, Any]) -> str:
    parts: list[str] = []
    for child in node.get('children') or []:
        t = (child.get('title') or '').strip()
        c = (child.get('content') or '').strip()
        if t and c:
            parts.append(f'- **{t}**：{c}')
        elif t:
            parts.append(f'- **{t}**')
        for gc in child.get('children') or []:
            gt = (gc.get('title') or '').strip()
            gc_content = (gc.get('content') or '').strip()
            if gt and gc_content:
                parts.append(f'  - **{gt}**：{gc_content}')
            elif gt:
                parts.append(f'  - **{gt}**')
    return '\n'.join(parts)


def outline_sections_for_writing(
    nodes: list[dict[str, Any]] | None,
    *,
    total_words: int = 2000,
) -> list[dict[str, Any]]:
    """按大纲写稿：仅顶层章节为一节，子要点并入本节 brief（不单独成 ##）。"""
    brief_max = writing_context_limits(total_words)['section_brief_max']
    sections: list[dict[str, Any]] = []
    for node in nodes or []:
        title = (node.get('title') or '').strip()
        if not title:
            continue
        brief_parts: list[str] = []
        own = (node.get('content') or '').strip()
        if own:
            brief_parts.append(own)
        child_brief = _merge_children_brief(node)
        if child_brief:
            brief_parts.append(child_brief)
        sections.append({
            'id': node.get('id'),
            'title': title,
            'content': truncate_text('\n\n'.join(brief_parts), brief_max),
            'section_type': node.get('section_type') or node.get('sectionType') or 'info',
            'level': 0,
        })
    return sections


def flatten_section_headings(text: str) -> str:
    """将 ## / ### 等标题行内化（仅保留行首单个 # 的文章主标题）。"""
    if not (text or '').strip():
        return text or ''
    out: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if re.match(r'^#{2,6}\s+\S', stripped):
            m = re.match(r'^#{2,6}\s+(.+?)\s*$', stripped)
            if m:
                if out and out[-1].strip():
                    out.append('')
                out.append(f'**{m.group(1).strip()}**')
            continue
        out.append(line)
    result = '\n'.join(out)
    return re.sub(r'\n{3,}', '\n\n', result).strip()


def internalize_h2_headings(text: str) -> str:
    """兼容旧名：二级/三级标题一并扁平化。"""
    return flatten_section_headings(text)


def flatten_outline_nodes(nodes: list[dict[str, Any]], level: int = 0) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for node in nodes or []:
        flat.append({
            'id': node.get('id'),
            'title': node.get('title', ''),
            'content': node.get('content', ''),
            'section_type': node.get('section_type') or node.get('sectionType') or 'info',
            'level': level,
        })
        children = node.get('children') or []
        flat.extend(flatten_outline_nodes(children, level + 1))
    return flat


def outline_nodes_to_markdown(nodes: list[dict[str, Any]], level: int = 0) -> str:
    lines: list[str] = []
    for node in nodes or []:
        prefix = '#' * min(level + 2, 6)
        title = node.get('title', '').strip()
        if title:
            lines.append(f'{prefix} {title}')
        brief = (node.get('content') or '').strip()
        if brief:
            lines.append(brief)
        child_md = outline_nodes_to_markdown(node.get('children') or [], level + 1)
        if child_md:
            lines.append(child_md)
    return '\n\n'.join(part for part in lines if part)


def outline_sections_index(sections: list[dict[str, Any]]) -> str:
    """紧凑章节索引（仅标题，避免每节重复注入整份大纲正文）。"""
    lines: list[str] = []
    for i, sec in enumerate(sections):
        title = (sec.get('title') or '').strip()
        if title:
            lines.append(f'{i + 1}. {title}')
    return '\n'.join(lines) if lines else '（无）'


def strip_overlap_with_prior(block: str, prior: str, *, max_tail: int = 1200) -> str:
    """若模型把前文抄进本节开头，去掉与前文尾部重叠的部分。"""
    text = (block or '').strip()
    tail = (prior or '').strip()
    if not text or not tail:
        return text
    tail = tail[-max_tail:]
    overlap_max = min(len(tail), len(text))
    for size in range(overlap_max, 0, -1):
        fragment = tail[-size:]
        if len(fragment) < 4:
            continue
        if text.startswith(fragment):
            return text[size:].lstrip()
    return text


def extract_single_section_block(
    block: str,
    title: str,
    other_titles: list[str],
) -> str:
    """只保留当前章节块；去掉模型误写的其他章节（**标题** 分段）。"""
    text = (block or '').strip()
    if not title or not text:
        return text
    marker = f'**{title.strip()}**'
    if marker not in text:
        return text
    start = text.find(marker)
    segment = text[start:]
    for other in other_titles:
        ot = (other or '').strip()
        if not ot or ot == title.strip():
            continue
        other_marker = f'**{ot}**'
        pos = segment.find(other_marker, len(marker))
        if pos > 0:
            segment = segment[:pos]
    return segment.strip()


def verify_draft_covers_outline(draft: str, sections: list[dict[str, Any]]) -> list[str]:
    """返回未在正文中出现的章节标题（用于校验是否按大纲写全）。"""
    body = draft or ''
    missing: list[str] = []
    for sec in sections:
        title = (sec.get('title') or '').strip()
        if not title:
            continue
        if title not in body:
            missing.append(title)
    return missing
