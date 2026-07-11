"""深度分析：联网搜索 + 项目资料 + 结构化报告（热点解读型五段式）。"""
from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..content_loader import get_frameworks
from ..models import ResearchMaterial
from ..services.hotnews_service import HotNewsService
from ..services.llm_service import LLMService, _invoke_with_retry
from ..utils import parse_json_from_llm

logger = logging.getLogger(__name__)

SEARCH_TIMEOUT_SEC = 15
DEFAULT_SEARCH_MAX = 12
MATERIAL_SNIPPET_MAX = 1500
FRAMEWORK_ID = 'hot_topic'


def _tavily_key() -> str | None:
    return os.getenv('TAVILY_API_KEY') or None


def deep_analysis_section_titles() -> list[str]:
    fw = get_frameworks().get(FRAMEWORK_ID) or {}
    sections = fw.get('sections') or []
    titles = [str(s.get('title') or '').strip() for s in sections if s.get('title')]
    if titles:
        return titles
    return [
        '事件速览',
        '表面信息',
        '深层分析',
        '影响预判',
        '读者行动',
    ]


def _truncate(text: str, limit: int) -> str:
    t = (text or '').strip()
    if len(t) <= limit:
        return t
    return t[:limit] + '…'


def format_search_evidence(items: list[dict[str, Any]], *, max_items: int = 12) -> str:
    lines: list[str] = []
    for i, item in enumerate(items[:max_items], 1):
        title = item.get('title') or ''
        content = item.get('content') or ''
        source = item.get('source') or ''
        url = item.get('url') or ''
        if not title and not content:
            continue
        lines.append(
            f'{i}. [{source}] {title}\n'
            f'   摘要：{_truncate(content, 280)}\n'
            f'   链接：{url}',
        )
    return '\n'.join(lines) if lines else '（联网搜索无结果）'


def format_material_evidence(materials: list[dict[str, Any]], *, max_items: int = 10) -> str:
    lines: list[str] = []
    for i, m in enumerate(materials[:max_items], 1):
        title = m.get('title') or '无标题'
        body = m.get('summary') or m.get('content') or ''
        url = m.get('source_url') or ''
        lines.append(
            f'{i}. {title}\n'
            f'   {_truncate(body, MATERIAL_SNIPPET_MAX)}\n'
            f'   来源：{url or "（本地资料）"}',
        )
    return '\n'.join(lines) if lines else '（项目内暂无已存资料）'


def run_web_search_for_topic(
    query: str,
    *,
    max_results: int = DEFAULT_SEARCH_MAX,
    tavily_api_key: str | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    q = HotNewsService.normalize_search_query(query)
    if not q:
        return [], ['搜索词为空']
    key = tavily_api_key or _tavily_key()
    warnings: list[str] = []
    items: list[dict[str, Any]] = []
    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(
                HotNewsService.search_combined,
                q,
                key,
                max_results,
            )
            items, warnings = fut.result(timeout=SEARCH_TIMEOUT_SEC)
    except FuturesTimeout:
        warnings.append('联网搜索超时，将主要依据已有资料')
        logger.warning('deep analysis search timeout: %s', q)
    except Exception as e:
        warnings.append(f'联网搜索失败：{e}')
        logger.warning('deep analysis search failed: %s', e)
    return items, warnings


def load_project_materials(project_id: str | None) -> list[dict[str, Any]]:
    if not project_id:
        return []
    return list(ResearchMaterial.get_by_project(project_id))


def sections_to_markdown(sections: list[dict[str, str]]) -> str:
    parts: list[str] = []
    for sec in sections:
        title = (sec.get('title') or '').strip()
        body = (sec.get('content') or '').strip()
        if not title and not body:
            continue
        parts.append(f'## {title}\n\n{body}')
    return '\n\n'.join(parts)


def outline_nodes_from_sections(
    sections: list[dict[str, str]],
    *,
    article_title: str,
) -> list[dict[str, Any]]:
    import time

    base = int(time.time() * 1000)
    nodes: list[dict[str, Any]] = []
    for i, sec in enumerate(sections):
        title = (sec.get('title') or f'章节{i + 1}').strip()
        content = (sec.get('content') or '').strip()
        nodes.append({
            'id': base + i,
            'title': title,
            'content': _truncate(content, 400),
            'sectionType': 'info',
            'children': [],
        })
    return nodes


def generate_deep_analysis(
    llm: LLMService,
    *,
    topic: str,
    description: str = '',
    project_id: str | None = None,
    use_web_search: bool = True,
    use_materials: bool = True,
    max_search_results: int = DEFAULT_SEARCH_MAX,
) -> dict[str, Any]:
    topic = (topic or '').strip()
    if not topic:
        raise ValueError('请输入分析主题或选题标题')

    warnings: list[str] = []
    search_items: list[dict[str, Any]] = []
    if use_web_search:
        search_items, search_warnings = run_web_search_for_topic(
            topic,
            max_results=min(max_search_results, 20),
        )
        warnings.extend(search_warnings)

    materials: list[dict[str, Any]] = []
    if use_materials and project_id:
        materials = load_project_materials(project_id)

    if not search_items and not materials:
        warnings.append('无联网结果且无项目资料，分析可能较空，建议先搜索并添加资料')

    section_titles = deep_analysis_section_titles()
    titles_block = '\n'.join(f'- {t}' for t in section_titles)
    evidence = (
        f'【联网搜索】\n{format_search_evidence(search_items)}\n\n'
        f'【项目资料库】\n{format_material_evidence(materials)}'
    )
    desc_block = f'\n补充说明：{description}' if description.strip() else ''

    prompt = ChatPromptTemplate.from_messages([
        (
            'system',
            '你是资深非虚构写作者与行业分析师。基于给定证据写深度分析，'
            '禁止编造未出现在证据中的数据、人名、机构与日期；不确定处须写明「待核实」。',
        ),
        (
            'user',
            f'''分析主题：{topic}{desc_block}

必须按下列章节输出（章节 title 与下列标题完全一致，content 为正文，每节 120～400 字）：
{titles_block}

证据（仅可引用此处信息）：
{evidence}

请以 JSON 返回，不要 markdown 代码块：
{{
  "sections": [{{"title": "章节标题", "content": "正文"}}],
  "suggested_claims": [{{"text": "可写入正文的核心判断", "source_quote": "证据中的原文或出处摘要"}}],
  "writing_angles": ["后续可写的角度1", "角度2"]
}}''',
        ),
    ])
    chain = prompt | llm.llm | StrOutputParser()
    raw = _invoke_with_retry(chain, input_vars={})
    parsed = parse_json_from_llm(raw) or {}

    sections: list[dict[str, str]] = []
    raw_sections = parsed.get('sections')
    if isinstance(raw_sections, list):
        for item in raw_sections:
            if isinstance(item, dict):
                sections.append({
                    'title': str(item.get('title') or ''),
                    'content': str(item.get('content') or ''),
                })

    if not sections:
        sections = [{'title': '深度分析', 'content': raw.strip()}]

    claims = parsed.get('suggested_claims')
    if not isinstance(claims, list):
        claims = []
    angles = parsed.get('writing_angles')
    if not isinstance(angles, list):
        angles = []

    report_md = sections_to_markdown(sections)
    return {
        'topic': topic,
        'framework_id': FRAMEWORK_ID,
        'warnings': warnings,
        'search_item_count': len(search_items),
        'material_count': len(materials),
        'search_items': search_items[:8],
        'sections': sections,
        'report_markdown': report_md,
        'suggested_claims': claims,
        'writing_angles': angles,
        'outline_nodes': outline_nodes_from_sections(sections, article_title=topic),
    }
