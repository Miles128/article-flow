"""写作相关 AI 操作的统一 SSE 流式输出"""
from __future__ import annotations

import json
import logging
from collections.abc import Callable, Iterator
from typing import Any

from ..article_format import ensure_article_title, get_article_format_prompt, section_opening_rule
from ..services.anti_ai_service import apply_rule_fixes
from ..config_loader import get_default_writing_style
from ..prompts.writing_style import rewrite_style_messages
from ..prompts.writing_style_intensity import (
    format_style_prompt,
    parse_style_intensity_from_data,
)
from ..prompts.writing_quality import (
    get_section_length_instruction,
    get_writing_quality_rules,
)
from ..utils_writing_sanitize import polish_generated_draft
from ..services.llm_service import LLMService
from ..services.llm_streaming import build_text_chain, iter_chain_text, iter_llm_messages
from ..services.style_context import merge_writing_context, enrich_writing_context_from_project, get_style_prompt
from ..utils import get_field, translate_error
from ..utils_markdown import merge_markdown_title, split_markdown_title
from ..utils_outline import (
    outline_sections_for_writing,
    verify_draft_covers_outline,
)

logger = logging.getLogger(__name__)

SUPPORTED_ACTIONS = frozenset({
    'continue',
    'polish',
    'rewrite',
    'expand',
    'shorten',
    'apply_prompt',
    'framework_generate',
    'generate_section',
})


def format_sse(payload: dict[str, Any]) -> str:
    return f'data: {json.dumps(payload, ensure_ascii=False)}\n\n'


def _style_prompt_from_data(data: dict[str, Any]) -> str:
    return get_style_prompt(
        get_field(data, 'style_profile_id', 'styleProfileId')
    )


def _post_process(text: str, llm: LLMService, style_prompt: str) -> str:
    processed = apply_rule_fixes(text)['fixed_content']
    if style_prompt:
        try:
            processed = llm.apply_anti_ai_polish(processed, style_prompt)
        except Exception as e:
            logger.warning('anti_ai polish skipped in stream: %s', e)
    return processed


def _stream_transform_body(
    llm: LLMService,
    content: str,
    body_fn: Callable[[str], Iterator[str]],
) -> Iterator[tuple[str, str]]:
    """yield (delta_token, accumulated_transformed_body_or_full)"""
    title_block, body = split_markdown_title(content)
    stream_input = body if title_block else content
    if title_block and not body.strip():
        raise ValueError('除标题外正文为空，请填写正文或选中含正文的片段后再转换')
    acc: list[str] = []
    for token in body_fn(stream_input):
        acc.append(token)
        partial = ''.join(acc)
        full = merge_markdown_title(title_block, partial) if title_block else partial
        yield token, full


def _tokens_continue(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    base = data.get('content') or ''
    ctx = merge_writing_context({**data, 'anti_ai_rules': True})
    context_str = ''
    if ctx:
        context_str = (
            f'\n\n写作背景信息：\n- 主题：{ctx.get("topic", "")}\n'
            f'- 目标读者：{ctx.get("audience", "")}\n- 风格要求：{ctx.get("style", "")}'
        )
    chain = build_text_chain(llm, [
        ('system', '你是一位专业的写作助手，擅长续写文章，保持原文风格和逻辑连贯性。'),
        (
            'user',
            f'请继续续写以下文章内容：\n\n{base}{context_str}\n\n'
            '请直接续写，保持与前文一致的风格和语气。',
        ),
    ])
    acc: list[str] = []
    for token in iter_chain_text(chain):
        acc.append(token)
        yield token, base + ''.join(acc)


def _tokens_polish(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    style = data.get('style', get_default_writing_style())
    intensity = parse_style_intensity_from_data(data)
    fallback = get_default_writing_style()
    style_desc = format_style_prompt(style, intensity) or format_style_prompt(
        fallback, intensity,
    )

    def body_fn(body: str) -> Iterator[str]:
        chain = build_text_chain(llm, [
            ('system', '你是一位资深的编辑和写作顾问，擅长润色文章，提升表达质量。'),
            (
                'user',
                f'请润色以下正文，要求风格：{style_desc}\n\n原文：\n{body}\n\n'
                '请输出润色后的正文，保持原意不变，优化表达、语法和流畅度。'
                '不要添加或修改文章标题。\n'
                f'{get_article_format_prompt()}',
            ),
        ])
        yield from iter_chain_text(chain)

    yield from _stream_transform_body(llm, data.get('content') or '', body_fn)


def _tokens_rewrite(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    style = data.get('style')
    if not style:
        raise ValueError('style is required')

    intensity = parse_style_intensity_from_data(data)

    def body_fn(body: str) -> Iterator[str]:
        chain = build_text_chain(
            llm,
            rewrite_style_messages(body, style, intensity=intensity),
        )
        yield from iter_chain_text(chain)

    yield from _stream_transform_body(llm, data.get('content') or '', body_fn)


def _tokens_expand(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    target_length = min(int(data.get('target_length') or 500), 10000)
    ctx = merge_writing_context(data)
    style_note = ctx.get('style', '')

    def body_fn(body: str) -> Iterator[str]:
        messages = [
            {'role': 'system', 'content': '你是一位专业的内容扩展专家，善于丰富文章内容。'},
            {
                'role': 'user',
                'content': (
                    f'请扩展以下正文，目标字数约{target_length}字：\n\n原文：\n{body}\n\n'
                    f'风格：{style_note}\n\n要求：\n1. 保持原意不变\n2. 增加细节、例子或解释\n'
                    '3. 保持逻辑连贯\n4. 不要重复内容\n5. 避免AI套话\n'
                    '6. 不要添加或修改文章标题，只输出正文\n'
                    f'{get_article_format_prompt()}\n\n请直接输出扩展后的正文。'
                ),
            },
        ]
        lc = []
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        for msg in messages:
            role = msg['role']
            if role == 'system':
                lc.append(SystemMessage(content=msg['content']))
            elif role == 'user':
                lc.append(HumanMessage(content=msg['content']))
            elif role == 'assistant':
                lc.append(AIMessage(content=msg['content']))
        yield from iter_llm_messages(llm.llm, lc)

    yield from _stream_transform_body(llm, data.get('content') or '', body_fn)


def _tokens_shorten(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    content = data.get('content') or ''
    target_count = get_field(data, 'target_word_count', 'targetWordCount')
    if target_count is not None:
        target = max(50, int(target_count))
    else:
        ratio = max(0.1, min(float(get_field(data, 'target_ratio', default=0.5) or 0.5), 1.0))
        approx = len(content.replace('\n', '').replace(' ', '')) or 1
        target = max(50, int(approx * ratio))
    style_prompt = _style_prompt_from_data(data)
    style_note = f'\n风格参考：{style_prompt}' if style_prompt else ''

    def body_fn(body: str) -> Iterator[str]:
        messages = [
            {
                'role': 'system',
                'content': '你是一位专业的内容压缩专家，善于在指定字数内保留核心信息。',
            },
            {
                'role': 'user',
                'content': (
                    f'请将以下正文压缩到约 {target} 字（允许 ±10%），保留所有关键信息与逻辑顺序，'
                    f'删除重复、啰嗦和空泛表达，避免 AI 套话。{style_note}\n\n原文：\n{body}\n\n'
                    '不要添加或修改文章标题，只输出压缩后的正文。\n'
                    f'{get_article_format_prompt()}'
                ),
            },
        ]
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        lc = []
        for msg in messages:
            role = msg['role']
            if role == 'system':
                lc.append(SystemMessage(content=msg['content']))
            elif role == 'user':
                lc.append(HumanMessage(content=msg['content']))
            elif role == 'assistant':
                lc.append(AIMessage(content=msg['content']))
        yield from iter_llm_messages(llm.llm, lc)

    yield from _stream_transform_body(llm, content, body_fn)


def _tokens_apply_prompt(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    instruction = get_field(data, 'instruction', 'prompt')
    if not instruction or not str(instruction).strip():
        raise ValueError('instruction is required')
    style_prompt = _style_prompt_from_data(data)
    style_block = f'\n\n写作风格参考：\n{style_prompt}' if style_prompt else ''

    def body_fn(body: str) -> Iterator[str]:
        chain = build_text_chain(llm, [
            (
                'system',
                '你是一位资深编辑。根据用户的整体修改要求改写正文，保留核心事实与结构，'
                '避免「在当今/随着/值得注意的是/综上所述」等 AI 套话。只输出修改后的正文，'
                '不要添加或修改文章标题。',
            ),
            (
                'user',
                '整体修改要求：\n{instruction}\n\n正文：\n{content}{style_block}'
                '\n\n请直接输出修改后的正文，不要解释。\n'
                + get_article_format_prompt(),
            ),
        ])
        yield from iter_chain_text(
            chain,
            {
                'instruction': str(instruction).strip(),
                'content': body,
                'style_block': style_block,
            },
        )

    yield from _stream_transform_body(llm, data.get('content') or '', body_fn)


def _tokens_framework(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    project_id = data.get('project_id') or data.get('projectId')
    outline_text = data.get('outline', '')
    nodes = data.get('nodes', [])
    if not nodes and project_id:
        from ..models import Outline

        o = Outline.get_by_project(project_id)
        nodes = o.get('nodes', []) if o else []
        if o and o.get('title') and not outline_text:
            outline_text = o['title']
    if not outline_text and nodes:
        from ..utils_outline import outline_nodes_to_markdown

        outline_text = outline_nodes_to_markdown(nodes)
    if not outline_text:
        raise ValueError('请先在「生成大纲」步骤保存大纲')

    context = merge_writing_context({**data, 'anti_ai_rules': True})
    if project_id:
        context = enrich_writing_context_from_project(project_id, context)
    research = (context.get('research') or '')[:3000]
    anti = context.get('anti_ai_rules', '')
    chain = build_text_chain(llm, [
        ('system', '你是一位专业的文档撰写专家。必须严格按给定大纲的章节顺序与要点写作，不得遗漏章节，不得另起话题。'),
        (
            'user',
            f'''请严格按照以下大纲生成完整文章（Markdown）：

{outline_text}

参考资料（可引用，勿编造）：
{research if research else '（无）'}

{anti}

【强制要求】
1. 大纲中的每个章节标题都必须出现在正文中（**标题** 内化点题，逐字一致，禁止 ##）
2. 每个章节下的要点说明必须全部体现
3. 不得跳过、合并或重排章节
4. 保持全篇术语与数据口径一致

{get_article_format_prompt()}''',
        ),
    ])
    acc: list[str] = []
    for token in iter_chain_text(chain):
        acc.append(token)
        yield token, ''.join(acc)


def _tokens_generate_section(llm: LLMService, data: dict[str, Any]) -> Iterator[tuple[str, str]]:
    title = data.get('section_title') or data.get('sectionTitle', '')
    if not title:
        raise ValueError('section_title is required')
    section_type = data.get('section_type') or data.get('sectionType', 'info')
    project_id = data.get('project_id') or data.get('projectId')
    ctx = merge_writing_context({**data, 'anti_ai_rules': True})
    ctx['section_brief'] = (
        data.get('section_brief')
        or data.get('sectionBrief')
        or data.get('section_content')
        or data.get('sectionContent')
        or ctx.get('section_brief')
        or ''
    )
    if project_id:
        ctx = enrich_writing_context_from_project(project_id, ctx)
    explicit_target = get_field(data, 'target_word_count', 'targetWordCount')
    if explicit_target is not None:
        ctx['target_word_count'] = max(120, int(explicit_target))

    style_block = ctx.get('style', '')
    research = ctx.get('research', '')
    prior = ctx.get('prior_sections', '')
    anti = ctx.get('anti_ai_rules', '')
    section_brief = (ctx.get('section_brief') or '').strip()
    from ..utils_outline import truncate_text, writing_context_limits

    tw = int(ctx.get('target_word_count') or ctx.get('target_total_words') or 400)
    limits = writing_context_limits(tw)
    outline_index = truncate_text(
        (ctx.get('outline_index') or '').strip(),
        limits['outline_index_max'],
    )
    if not outline_index:
        full_outline = (ctx.get('full_outline') or '').strip()
        outline_index = truncate_text(full_outline, limits['outline_index_max'])
    section_index = ctx.get('section_index') or 0
    section_total = ctx.get('section_total') or 0
    target_words = int(ctx.get('target_word_count') or 400)

    if section_type == 'experience':
        chain = build_text_chain(llm, [
            ('system',
             '你是专业写作者。用第一人称"我"写个人经验，必须具体、有细节。'
             + get_writing_quality_rules()),
            (
                'user',
                f'''请撰写章节「{title}」（经验型，第一人称）。

【强制要求】
1. {section_opening_rule(title)}
2. 用第一人称「我」写真实经验——像个人博客，不要教科书腔
3. 必须有具体场景（时间、地点、发生了什么）、具体数据、个人反思
4. 禁止「通过/实现/显著/在当今」等AI套话
5. 可以加入个人情绪（踩坑了、后悔了、学到了）

本节大纲要点：
{section_brief if section_brief else '（无额外要点，根据章节标题自由发挥个人经验）'}

文章章节索引（勿展开其他节）：
{outline_index or '（无）'}

风格与约束：
{style_block}
{anti}

参考资料：
{research[:2000] if research else '（无）'}

{get_article_format_prompt()}

{get_section_length_instruction(target_words, target_words)}
只输出本节新内容；可用 1～2 句承接上文，勿复制前文、勿写其他章节。''',
            ),
        ])
    else:
        index_hint = ''
        if section_index and section_total:
            index_hint = f'\n当前进度：第 {section_index}/{section_total} 节。只写本节，禁止写其他章节。'
        chain = build_text_chain(llm, [
            ('system',
             '你是专业写作者。严格按大纲撰写，论证清楚，禁止编造案例。\n'
             + get_writing_quality_rules()),
            (
                'user',
                f'''请撰写章节「{title}」。
{index_hint}

【强制要求】
1. {section_opening_rule(title)}
2. 必须覆盖下方「本节大纲要点」中的所有信息，不得另起话题
3. 不得写入其他章节的标题或内容
4. 不得跳过或合并章节

本节大纲要点（必须全部体现）：
{section_brief if section_brief else '（无额外要点，但仍须紧扣章节标题）'}

文章章节索引（勿写其他节）：
{outline_index or '（无）'}

章节类型：信息型（由 AI 撰写）

风格与约束：
{style_block}
{anti}

衔接参考（禁止复制到正文）：
{prior[:900] if prior else '（无）'}

参考资料：
{research[:2000] if research else '（无）'}

{get_article_format_prompt()}

{get_section_length_instruction(target_words, target_words)}
只输出本节新段落；可用 1～2 句承接上文，勿复制前文、勿写其他章节。''',
            ),
        ])

    acc: list[str] = []
    for token in iter_chain_text(chain):
        acc.append(token)
        yield token, polish_generated_draft(''.join(acc))


_TOKEN_DISPATCH: dict[str, Callable[[LLMService, dict[str, Any]], Iterator[tuple[str, str]]]] = {
    'continue': _tokens_continue,
    'polish': _tokens_polish,
    'rewrite': _tokens_rewrite,
    'expand': _tokens_expand,
    'shorten': _tokens_shorten,
    'apply_prompt': _tokens_apply_prompt,
    'framework_generate': _tokens_framework,
    'generate_section': _tokens_generate_section,
}


def iter_writing_ai_events(
    llm: LLMService,
    data: dict[str, Any],
) -> Iterator[str]:
    action = (data.get('action') or '').strip()
    if action not in SUPPORTED_ACTIONS:
        raise ValueError(f'不支持的 action: {action}')

    yield format_sse({'type': 'start', 'action': action})

    token_fn = _TOKEN_DISPATCH[action]
    last_full = ''
    try:
        for _delta, full in token_fn(llm, data):
            last_full = full
            yield format_sse({'type': 'delta', 'text': _delta, 'content': full})

        _needs_body = frozenset({
            'polish', 'rewrite', 'expand', 'shorten', 'apply_prompt',
        })
        if action in _needs_body and not (last_full or '').strip():
            yield format_sse({
                'type': 'error',
                'message': '模型未返回内容，请检查 LLM API Key 与模型配置后重试',
            })
            return

        if action == 'framework_generate':
            article_title = ''
            project_id = data.get('project_id') or data.get('projectId')
            if project_id:
                from ..models import Outline

                o = Outline.get_by_project(project_id)
                if o and o.get('title'):
                    article_title = o['title']
            raw = ensure_article_title(last_full, article_title)
            nodes = data.get('nodes', [])
            if not nodes and project_id:
                from ..models import Outline

                o = Outline.get_by_project(project_id)
                nodes = o.get('nodes', []) if o else []
            flat = outline_sections_for_writing(nodes) if nodes else []
            missing = verify_draft_covers_outline(raw, flat) if flat else []
            final = polish_generated_draft(
                _post_process(raw, llm, _style_prompt_from_data(data)),
            )
            yield format_sse({
                'type': 'done',
                'content': final,
                'missing_sections': missing,
            })
            return

        if action == 'generate_section':
            final = polish_generated_draft(apply_rule_fixes(last_full)['fixed_content'])
            yield format_sse({'type': 'done', 'content': final})
            return

        if action == 'continue':
            style_prompt = _style_prompt_from_data(data)
            continuation = _post_process(last_full[len(data.get('content') or ''):], llm, style_prompt)
            base = data.get('content') or ''
            yield format_sse({
                'type': 'done',
                'content': base + continuation,
                'continuation': continuation,
            })
            return

        if action == 'rewrite':
            # 风格转换：仅规则去 AI 味，不再用「风格画像」二次润色（会把文体改回去）
            final = apply_rule_fixes(last_full)['fixed_content']
        else:
            style_prompt = _style_prompt_from_data(data)
            final = _post_process(last_full, llm, style_prompt)
        extra: dict[str, Any] = {'type': 'done', 'content': final}
        if action == 'shorten':
            extra['target_word_count'] = get_field(data, 'target_word_count', 'targetWordCount')
            extra['source_word_count'] = get_field(data, 'source_word_count', 'sourceWordCount')
        yield format_sse(extra)
    except Exception as e:
        logger.error('writing ai stream failed: %s', e, exc_info=True)
        yield format_sse({'type': 'error', 'message': translate_error(e)})
