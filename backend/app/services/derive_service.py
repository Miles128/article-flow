"""母稿 → 多形态派生（平台 Prompt 模板）"""
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..content_loader import get_platform_prompts
from ..services.llm_service import LLMService

DEFAULT_PLATFORMS = ('wechat', 'xiaohongshu', 'voice')


def derive_variants(
    mother: str,
    llm: LLMService,
    platforms: tuple[str, ...] | None = None,
) -> dict[str, str]:
    text = (mother or '').strip()
    if not text:
        raise ValueError('母稿内容不能为空')

    cfg = get_platform_prompts()
    principles = cfg.get('writing_principles', '')
    platform_cfg = cfg.get('platforms', {})
    targets = platforms or DEFAULT_PLATFORMS

    variants: dict[str, str] = {}
    for key in targets:
        pconf = platform_cfg.get(key)
        if not pconf:
            variants[key] = llm.convert_format(text, key if key != 'voice' else 'general')
            continue
        prompt_text = pconf.get('prompt', '')
        prompt = ChatPromptTemplate.from_messages([
            ('system', f'你是多平台内容编辑。{principles}'),
            ('user', '{instruction}\n\n【母稿】\n{content}'),
        ])
        chain = prompt | llm.llm | StrOutputParser()
        variants[key] = chain.invoke({
            'instruction': prompt_text,
            'content': text[:12000],
        })
    return variants
