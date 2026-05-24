"""人味化改写 pass"""
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..content_loader import get_humanize_checklist
from ..services.llm_service import LLMService
from ..services.anti_ai_service import scan_content


def build_humanize_prompt() -> str:
    checklist = get_humanize_checklist()
    checks = checklist.get('checks', [])
    lines = [f"- {c.get('name')}: {c.get('rule', '')}" for c in checks]
    transitions = '、'.join(checklist.get('transition_forbidden', [])[:15])
    vocab = '、'.join(checklist.get('ai_vocab_blacklist', [])[:15])
    return f'''对以下文章执行「人味化改写 pass」，逐段改写，不要解释过程。

强制清单：
{chr(10).join(lines)}

禁用连接词（命中>1次必须改）：{transitions}…
AI高频词（命中>2次必须改）：{vocab}…

要求：
1. 保留事实、数据、核心观点
2. 增加句长抖动、口语化、第一人称（≥3次「我」）
3. 开头用具体场景/数字，禁止「随着…发展」
4. 直接输出改写后的完整 Markdown 文章'''


def humanize_content(content: str, llm: LLMService) -> dict:
    text = (content or '').strip()
    if not text:
        raise ValueError('content is required')
    before = scan_content(text)
    prompt = ChatPromptTemplate.from_messages([
        ('system', '你是反 AI 检测审校，专门把人味加回文章。'),
        ('user', '{instruction}\n\n【原文】\n{content}'),
    ])
    chain = prompt | llm.llm | StrOutputParser()
    rewritten = chain.invoke({
        'instruction': build_humanize_prompt(),
        'content': text[:15000],
    })
    after = scan_content(rewritten)
    return {
        'content': rewritten.strip(),
        'before_score': before['score'],
        'after_score': after['score'],
        'improved': after['score'] < before['score'],
        'gate_status': after['gate_status'],
    }
