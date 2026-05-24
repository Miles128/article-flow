"""大纲工具"""
from typing import Any


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
