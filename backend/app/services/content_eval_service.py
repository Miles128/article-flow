"""内容评估：规则量表 + Critic 五维"""
import json
import re
from typing import TypedDict

from ..content_loader import get_eval_rubric, get_title_formulas
from ..services.anti_ai_service import scan_content
from ..services.llm_service import LLMService, _invoke_with_retry
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


class EvalResult(TypedDict):
    total_score: int
    passed: bool
    dimensions: dict[str, int]
    ai_flavor_score: int
    ai_flavor_band: str
    suggestions: list[str]


def _ai_flavor_band(score: int, rubric: dict) -> str:
    for band in rubric.get('ai_flavor_bands', []):
        if score <= int(band.get('max', 100)):
            return str(band.get('label', ''))
    return '未知'


def eval_article_rules(content: str, title: str = '') -> EvalResult:
    rubric = get_eval_rubric()
    formulas = get_title_formulas()
    scan = scan_content(content)
    ai_score = scan['score']
    suggestions: list[str] = []

    dims_cfg = rubric.get('dimensions', {})
    dims: dict[str, int] = {}

    title_max = int(dims_cfg.get('title', {}).get('max', 15))
    if title:
        t_score = title_max
        banned = formulas.get('banned_title_words', [])
        for w in banned:
            if w in title:
                t_score -= 4
                suggestions.append(f'标题含禁词「{w}」')
        if re.search(r'\d', title):
            t_score = min(title_max, t_score + 2)
        dims['title'] = max(0, min(title_max, t_score))
    else:
        dims['title'] = 0
        suggestions.append('缺少标题')

    opening_max = int(dims_cfg.get('opening', {}).get('max', 15))
    intro = content[:200]
    opening_score = opening_max
    if any(p in intro for p in ('在当今', '随着', '近年来', '众所周知')):
        opening_score -= 8
        suggestions.append('开头有套话，改用场景切入')
    dims['opening'] = max(0, opening_score)

    body_max = int(dims_cfg.get('body', {}).get('max', 25))
    body_score = body_max
    if len(content) < 800:
        body_score -= 8
        suggestions.append('正文偏短，补充案例或数据')
    if not re.search(r'\d', content):
        body_score -= 5
        suggestions.append('缺少具体数字')
    dims['body'] = max(0, body_score)

    lang_max = int(dims_cfg.get('language', {}).get('max', 15))
    lang_score = lang_max - min(10, scan['match_count'])
    dims['language'] = max(0, lang_score)

    ai_max = int(dims_cfg.get('ai_flavor', {}).get('max', 30))
    ai_dim = max(0, ai_max - int(ai_score * ai_max / 100))
    dims['ai_flavor'] = ai_dim
    if ai_score > 60:
        suggestions.append('AI味过高，建议运行人味化改写')

    close_max = int(dims_cfg.get('closing', {}).get('max', 10))
    tail = content[-300:]
    close_score = close_max
    if '？' not in tail and '?' not in tail:
        close_score -= 4
        suggestions.append('结尾可加互动问句')
    dims['closing'] = max(0, close_score)

    total = sum(dims.values())
    publish_threshold = int(rubric.get('publish_threshold', 75))
    rewrite_threshold = int(rubric.get('rewrite_threshold', 60))

    return {
        'total_score': total,
        'passed': total >= publish_threshold and ai_score < 61,
        'dimensions': dims,
        'ai_flavor_score': ai_score,
        'ai_flavor_band': _ai_flavor_band(ai_score, rubric),
        'suggestions': suggestions,
        'rewrite_required': ai_score > rewrite_threshold or total < publish_threshold,
    }


def run_critic(
    llm: LLMService,
    content: str,
    topic: str = '',
    platform: str = 'wechat',
    context: str = '',
) -> dict[str, object]:
    rubric = get_eval_rubric()
    dims = rubric.get('critic_dimensions', {})
    dim_lines = '\n'.join(
        f"- {v.get('label', k)}（{v.get('max', 2)}分）"
        for k, v in dims.items()
    )
    prompt = ChatPromptTemplate.from_messages([
        ('system', '你是资深内容编辑。严格输出 JSON，不要其他文字。'),
        ('user', '''评估以下文章（满分10分）：
维度：
{dim_lines}

平台：{platform}
主题：{topic}

素材摘要（如有）：
{context}

文章：
{content}

输出 JSON：
{{"score": 1-10整数, "feedback": "100字内建议", "breakdown": {{"accuracy": 0-2, "structure": 0-2, "platform_fit": 0-2, "readability": 0-2, "density": 0-2}}}}'''),
    ])
    chain = prompt | llm.llm | StrOutputParser()
    raw = _invoke_with_retry(chain, llm.llm, input_vars={
        'dim_lines': dim_lines,
        'platform': platform,
        'topic': topic,
        'context': context,
        'content': content,
    })
    parsed: dict = {}
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    if m:
        try:
            parsed = json.loads(m.group())
        except json.JSONDecodeError:
            parsed = {'score': 7, 'feedback': raw[:100]}
    score = int(parsed.get('score', 7))
    score = max(1, min(10, score))
    return {
        'score': score,
        'feedback': parsed.get('feedback', ''),
        'breakdown': parsed.get('breakdown', {}),
        'passed': score >= 7,
    }
