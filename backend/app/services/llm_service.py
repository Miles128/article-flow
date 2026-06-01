"""LLM 服务管理器 - 实例缓存 + 超时控制 + 重试"""
import os
import time
import logging
from typing import Dict, Any, List
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..article_format import get_article_format_prompt, section_opening_rule
from ..services.anti_ai_service import get_anti_ai_style_prompt
from ..config_loader import get_seo_rules, get_title_formulas

logger = logging.getLogger(__name__)


def _escape_lc_template(text: str) -> str:
    """LangChain ChatPromptTemplate 字面量大括号转义。"""
    return text.replace('{', '{{').replace('}', '}}')


_llm_cache: Dict[str, 'LLMService'] = {}

DEFAULT_REQUEST_TIMEOUT = 120
MAX_CACHE_SIZE = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1


def max_output_tokens_for_words(word_count: int) -> int:
    """按目标字数限制模型输出 token，减少单节写爆导致全文超标、被截断。"""
    wc = max(80, int(word_count))
    return min(8192, max(384, int(wc * 2.2)))

from ..config_loader import get_default_writing_style
from ..prompts.writing_style import rewrite_style_messages
from ..prompts.writing_style_intensity import (
    format_style_prompt,
    get_destylize_instruction,
    parse_style_intensity_from_data,
)
from ..services.style_rewrite_service import (
    rewrite_body_selective,
    should_use_selective_rewrite,
)
from ..prompts.writing_intent import normalize_writing_intent
from ..prompts.writing_quality import (
    get_section_length_instruction,
    get_section_writing_rules,
)
from ..utils_writing_sanitize import polish_generated_draft

# 允许的 platform 白名单
PLATFORM_WHITELIST = {
    'wechat': '微信公众号风格，吸引点击',
    'zhihu': '知乎风格，专业深度',
    'xiaohongshu': '小红书风格，活泼有趣',
    'bilibili': 'B站专栏风格，互动性强',
    'jianshu': '简书风格，简洁文艺',
    'toutiao': '今日头条风格，信息密度高',
    'general': '通用风格，简洁有力',
}


def _get_cache_key(provider, api_key, model_name, base_url, temperature):
    """生成缓存键"""
    return f"{provider}:{api_key or ''}:{model_name}:{base_url or ''}:{temperature}"


def _invoke_with_retry(chain, llm=None, max_retries=MAX_RETRIES, base_delay=RETRY_BASE_DELAY, input_vars=None):
    last_error = None
    for attempt in range(max_retries):
        try:
            return chain.invoke(input_vars or {})
        except Exception as e:
            last_error = e
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f'LLM call failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}')
            time.sleep(delay)
    raise last_error


class LLMService:
    def __init__(
        self,
        provider: str = None,
        model_name: str = None,
        api_key: str = None,
        base_url: str = None,
        temperature: float = None
    ):
        self.provider = provider or os.getenv('DEFAULT_MODEL_PROVIDER', 'custom')
        self.model_name = model_name or os.getenv('DEFAULT_MODEL_NAME', 'gpt-3.5-turbo')
        self.api_key = api_key
        self.base_url = base_url
        self.temperature = temperature if temperature is not None else 0.7
        self.llm = self._get_llm()

    def _get_llm(self) -> BaseChatModel:
        if self.provider == 'custom' or self.api_key:
            from langchain_openai import ChatOpenAI

            api_key = self.api_key or os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError('请先配置 API Key')

            base_url = self.base_url or os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')

            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=self.temperature,
                request_timeout=DEFAULT_REQUEST_TIMEOUT,
            )

        elif self.provider == 'openai':
            from langchain_openai import ChatOpenAI
            api_key = self.api_key or os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError('OPENAI_API_KEY 未设置')
            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=self.base_url,
                temperature=self.temperature,
                request_timeout=DEFAULT_REQUEST_TIMEOUT,
            )
        elif self.provider == 'anthropic':
            from langchain_anthropic import ChatAnthropic
            api_key = self.api_key or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError('ANTHROPIC_API_KEY 未设置')
            return ChatAnthropic(
                model=self.model_name,
                api_key=api_key,
                temperature=self.temperature,
                timeout=DEFAULT_REQUEST_TIMEOUT,
            )
        elif self.provider == 'zhipu':
            from langchain_openai import ChatOpenAI
            api_key = self.api_key or os.getenv('ZHIPU_API_KEY')
            if not api_key:
                raise ValueError('ZHIPU_API_KEY 未设置')
            base_url = self.base_url or 'https://open.bigmodel.cn/api/paas/v4/'
            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=self.temperature,
                request_timeout=DEFAULT_REQUEST_TIMEOUT,
            )
        else:
            raise ValueError(f'未知的 LLM 提供商: {self.provider}')

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        langchain_messages = []
        for msg in messages:
            role = msg.get('role')
            content = msg.get('content')
            if role == 'system':
                langchain_messages.append(SystemMessage(content=content))
            elif role == 'user':
                langchain_messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                langchain_messages.append(AIMessage(content=content))

        chain = self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars=langchain_messages)

    def continue_writing(self, current_content: str, context: Dict = None) -> str:
        context_str = ''
        if context:
            context_str = f'\n\n写作背景信息：\n- 主题：{context.get("topic", "")}\n- 目标读者：{context.get("audience", "")}\n- 风格要求：{context.get("style", "")}'

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的写作助手，擅长续写文章，保持原文风格和逻辑连贯性。'),
            ('user', f'请继续续写以下文章内容：\n\n{current_content}{context_str}\n\n请直接续写，保持与前文一致的风格和语气。')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def polish_content(
        self,
        content: str,
        style: str = 'professional',
        *,
        intensity: int | None = None,
    ) -> str:
        fallback = get_default_writing_style()
        style_key = style if format_style_prompt(style, intensity) else fallback
        style_desc = format_style_prompt(style_key, intensity)
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位资深的编辑和写作顾问，擅长润色文章，提升表达质量。'),
            ('user', f'请润色以下正文，要求风格：{style_desc}\n\n原文：\n{content}\n\n'
                     '请输出润色后的正文，保持原意不变，优化表达、语法和流畅度。'
                     '不要添加或修改文章标题。\n'
                     f'{get_article_format_prompt()}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def rewrite_content(
        self,
        content: str,
        style: str,
        *,
        intensity: int | None = None,
        restore_plain: bool = False,
        writing_intent: str | None = None,
    ) -> str:
        if should_use_selective_rewrite(
            style,
            intensity,
            restore_plain=restore_plain,
        ):
            return rewrite_body_selective(
                self.llm,
                content,
                style,
                intensity=intensity,
                writing_intent=writing_intent,
            )
        prompt = ChatPromptTemplate.from_messages(
            rewrite_style_messages(
                content,
                style,
                intensity=intensity,
                restore_plain=restore_plain,
            ),
        )
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def apply_writing_instruction(self, content: str, instruction: str, style_note: str = '') -> str:
        style_block = f'\n\n写作风格参考：\n{style_note}' if style_note else ''
        prompt = ChatPromptTemplate.from_messages([
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
                f'{get_article_format_prompt()}',
            ),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(
            chain,
            input_vars={'instruction': instruction, 'content': content, 'style_block': style_block},
        )

    def check_grammar(self, content: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的中文语法检查专家，擅长发现并修正语法错误、用词不当和标点问题。'),
            ('user', f'请检查以下文章的语法和用词问题：\n\n{content}\n\n请以JSON格式返回，格式如下：\n{{"issues": [{{"type": "语法错误/用词不当/标点问题", "position": "位置描述", "original": "原文", "suggestion": "修改建议", "explanation": "解释"}}], "corrected_content": "修正后的完整内容"}}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def summarize_content(self, content: str, max_length: int = 200) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的内容摘要专家，擅长提炼核心要点。'),
            ('user', f'请为以下内容生成摘要，字数不超过{max_length}字：\n\n{content}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def extract_keywords(self, content: str, count: int = 5) -> str:
        count = min(count, 20)
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位关键词提取专家，擅长从文章中提取最有价值的关键词。'),
            ('user', f'请从以下文章中提取{count}个核心关键词：\n\n{content}\n\n请直接返回关键词列表，用逗号分隔。')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def analyze_ai_taste(self, content: str) -> str:
        json_schema = (
            '{"score": 0-100, "issues": [{"text": "原文中有AI味的片段", '
            '"type": "套话|书面语|AI句式|抽象表达", "suggestion": "具体改写建议"}], '
            '"suggestions": ["整体优化建议1", "整体优化建议2"]}'
        )
        system_msg = (
            '你是一位AI内容检测专家，擅长识别文章的AI写作痕迹。从以下维度分析：'
            '1) 连接词使用频率；2) 套话使用情况；3) 句式多样性；4) 情感表达自然度。\n'
            f'请以JSON格式返回：{json_schema}'
        ).replace('{', '{{').replace('}', '}}')
        prompt = ChatPromptTemplate.from_messages([
            ('system', system_msg),
            ('user', '请分析以下文章的AI痕迹：\n\n{content}'),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={'content': content})

    def check_compliance(self, content: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位内容合规检查专家，擅长识别敏感内容、违规信息和潜在风险。'),
            ('user', f'请检查以下文章内容的合规性：\n\n{content}\n\n请以JSON格式返回：\n{{"is_compliant": true/false, "risk_level": "low/medium/high", "issues": [{{"type": "风险类型", "position": "位置", "description": "描述", "suggestion": "建议"}}], "suggestions": ["整体建议"]}}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def convert_format(self, content: str, target_platform: str) -> str:
        platform_rules = {
            'wechat': '微信公众号格式：段落短小（每段不超过3行）、使用emoji增加趣味性、小标题使用【】或▶️、重点内容加粗或变色',
            'zhihu': '知乎格式：结构清晰、使用Markdown标题层级、引用使用>、代码使用```、插入分割线',
            'xiaohongshu': '小红书格式：使用emoji点缀、段落极短、添加话题标签#、使用表情符号分隔、开头吸引眼球',
            'jianshu': '简书格式：标准Markdown、简洁清晰、适当使用引用和代码块',
            'general': '通用格式：标准Markdown、层次分明'
        }

        rules = platform_rules.get(target_platform, platform_rules['general'])

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位内容格式转换专家，擅长将文章转换为不同平台的最佳格式。'),
            ('user', f'请将以下文章转换为{target_platform}平台格式，规则如下：\n{rules}\n\n原文：\n{content}\n\n请直接输出转换后的内容。')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def select_writing_mode(self, brief: str, specification: str = "") -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位资深写作教练，擅长分析文章需求并推荐最佳写作模式。'),
            ('user', f'''请分析以下项目需求，推荐最合适的写作模式。

Brief: {brief}
选题规格: {specification if specification else "未设定"}

四种写作模式：
1. 教练模式 - AI引导用户自己写每一段，AI不生成内容。适合产品测评、使用体验、深度观点。时间3-4h，AI检测率<15%
2. 快速模式 - AI一次性生成初稿，用户审校修改。适合论文解读、技术总结、知识科普。时间1-2h，AI检测率25-40%
3. 混合模式 - AI写框架和信息型内容(40%)，用户填经验和观点(60%)。适合教程、案例分析、技术方案。时间2-3h，AI检测率18-25%
4. 框架约束模式 - 用户提供固定框架，AI按框架填内容。适合项目报告、开题报告、标书。时间1.5-3h，AI检测率20-35%

请以JSON格式返回：
{{"recommended_mode": "coach|fast|mixed|framework", "reason": "推荐理由", "article_type": "个人经历型|信息整理型|混合型", "material_level": "A|B|C|D", "predicted_ai_rate": "15-20%", "time_estimate": "3-4h", "quality_estimate": "⭐⭐⭐⭐⭐", "risk_warnings": ["风险1"]}}''')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def coach_mode_guide(self, section_info: Dict[str, Any]) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位严格的写作教练。你的职责是引导用户自己写作，绝不代笔。只提供结构框架和引导性问题，让用户基于自己的真实经历和思考来写。'),
            ('user', f'''当前段落：{section_info.get("title", "")}
段落目标：{section_info.get("goal", "")}
建议字数：{section_info.get("wordCount", "150-200")}字

请你：
1. 提供本段的结构建议（仅标题和段落划分，不写具体内容）
2. 提出3-5个引导性问题（5W1H、感官细节、内心世界、对比转折），帮用户回忆和挖掘真实细节
3. 绝对不要写任何可用作文章段落的句子

输出格式：先给结构建议，再给引导问题，用"---"分隔''')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def coach_mode_check(self, user_content: str, section_info: Dict[str, Any]) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是写作教练的质检员。检查用户写的段落是否有AI味、假细节，给出改进建议。'),
            ('user', f'''段落目标：{section_info.get("goal", "")}
目标字数：{section_info.get("wordCount", "150-200")}字

用户写的内容：
{user_content}

请检查：
1. 是否有AI套话（在当今/随着/值得注意的是/综上所述等）
2. 细节是否真实具体（有具体数字/场景/时间）
3. 是否有真实情感表达
4. 字数是否达标
5. 如有问题，给出具体修改建议

注意：只给建议，不要替用户改。''')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def framework_mode_generate(self, outline: str, context: Dict[str, Any]) -> str:
        from ..utils_outline import truncate_text, writing_context_limits

        tw = int(context.get('target_word_count') or context.get('target_total_words') or 2000)
        limits = writing_context_limits(tw)
        research = truncate_text(context.get('research') or '', limits['research_max'])
        anti = context.get('anti_ai_rules', '')
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的文档撰写专家。必须严格按给定大纲的章节顺序与要点写作，不得遗漏章节，不得另起话题。'),
            ('user', f'''请严格按照以下大纲生成完整文章（Markdown）：

{outline}

参考资料（可引用，勿编造）：
{research if research else '（无）'}

{anti}

【强制要求】
1. 大纲中的每个章节标题都必须出现在正文中（**标题** 单独一行点题，逐字一致，禁止 ## / ### 行）
2. 每个章节下的要点说明必须全部体现
3. 不得跳过、合并或重排章节
4. 保持全篇术语与数据口径一致

{get_article_format_prompt()}'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def three_pass_review(self, pass_type: str, content: str, context: Dict[str, Any] = None) -> str:
        if pass_type == 'content':
            system_msg = '''你是资深内容审校专家。请审校以下文章，聚焦：
1. 事实准确性 - 数据、引用、时间是否准确？
2. 逻辑连贯性 - 论证完整？前后矛盾？因果成立？
3. 结构完整性 - 要点覆盖？章节衔接？首尾呼应？

请以JSON格式返回：
{"score": 0-100, "issues": [{"type": "事实/逻辑/结构", "position": "位置", "original": "原文", "suggestion": "建议", "severity": "high|medium|low"}], "overall": "总体评价", "corrected_content": "修正后全文"}'''

        elif pass_type == 'style':
            intent = 'informational'
            if context:
                intent = normalize_writing_intent(
                    context.get('writing_intent') or context.get('writingIntent'),
                )
            if intent == 'insight_commentary':
                system_msg = '''你是风格审校专家（观点评论稿）。请审校以下文章，聚焦：
1. 删除套话与空话，保留并强化判断句与论证链
2. 抽象描述改为具体事实或可追溯推论；禁止一律改成口水口语
3. 打破机械对称列表；允许克制书面语与适度长句
4. 不得删减章节标题与核心论点

套话（必须消除）：在当今/随着/值得注意的是/综上所述/显著提升/具有重要意义

请以JSON格式返回：
{"ai_taste_score": 0-100, "issues": [{"type": "套话/空话/机械结构", "position": "位置", "original": "原文", "suggestion": "改写建议", "severity": "high|medium|low"}], "corrected_content": "润色后的全文", "before_after": {"before_score": 0-100, "after_score": 0-100, "improvement": "改善幅度描述"}}'''
            elif intent == 'literary_essay':
                system_msg = '''你是风格审校专家（叙事随笔）。请审校以下文章，聚焦：
1. 删除套话与堆砌比喻；保留有效意象与节奏
2. 须有作者视角与判断，不能只有描写
3. 不得为搞笑或口语化损害逻辑与信息

请以JSON格式返回：
{"ai_taste_score": 0-100, "issues": [{"type": "套话/堆砌修辞/缺判断", "position": "位置", "original": "原文", "suggestion": "改写建议", "severity": "high|medium|low"}], "corrected_content": "润色后的全文", "before_after": {"before_score": 0-100, "after_score": 0-100, "improvement": "改善幅度描述"}}'''
            else:
                system_msg = '''你是风格审校与降AI味专家。请审校以下文章，聚焦：
1. 删除套话；用具体数字和场景替代空洞形容词
2. 打破机械对称列表，改为自然叙述
3. 信息科普稿可适度口语化，但禁止损害事实准确性

AI套话库（必须消除）：在当今/随着/值得注意的是/综上所述/显著提升/充分利用

请以JSON格式返回：
{"ai_taste_score": 0-100, "issues": [{"type": "套话/书面语/AI句式", "position": "位置", "original": "原文", "suggestion": "改写建议", "severity": "high|medium|low"}], "corrected_content": "润色后的全文", "before_after": {"before_score": 0-100, "after_score": 0-100, "improvement": "改善幅度描述"}}'''

        elif pass_type == 'detail':
            system_msg = '''你是细节审校专家。请审校以下文章，聚焦：
1. 标点规范 - 中文标点/顿号并列/数字与百分号空格
2. 格式一致 - 标题层级/列表格式/代码块语言标注
3. 数字单位 - >10用阿拉伯数字/数字与单位间空格
4. 中英混排 - 英文词前后加空格/链接前后加空格
5. 段落换行 - 段落间空行

请以JSON格式返回：
{"score": 0-100, "issues": [{"type": "标点/格式/数字/混排/换行", "position": "位置", "original": "原文", "suggestion": "修改建议"}], "corrected_content": "修正后全文"}'''
        else:
            return ''

        prompt = ChatPromptTemplate.from_messages([
            ('system', _escape_lc_template(system_msg)),
            ('user', '{content}'),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={'content': content})

    def authenticity_check(self, content: str) -> str:
        system_msg = '''你是内容审查员，负责检查文章真实性。从5个维度检查，用生活常识和逻辑推理判断，不要机械匹配。

5个维度：
1. 温度（情感真实）- 有真实的情感表达和内心世界还原吗？
2. 个性（独特性）- 只有作者本人才写得出来吗？
3. 地域性（如适用）- 地域特征细节准确吗？
4. 真实细节（最重要）- 细节经得起常识推敲吗？有无违反物理规律/过度夸张/抽象空洞的细节？
5. 思想深度 - 有独特洞察还是套话堆砌？

AI味常见特征：
- 开头套话：在当今/随着...的发展/近年来
- 过渡套话：值得注意的是/需要指出的是/不得不说
- 书面语：显著提升/充分利用/有效改善
- AI句式：不仅...而且/通过...实现/基于...的

请以JSON格式返回：
{"overall_score": 0-10, "estimated_ai_rate": 0-100, "overall_impression": "总体印象", "dimensions": {"temperature": {"score": 0-10, "finding": "发现"}, "personality": {"score": 0-10, "finding": "发现"}, "locale": {"score": 0-10, "finding": "发现", "note": "如不适用标注N/A"}, "detail": {"score": 0-10, "finding": "发现"}, "depth": {"score": 0-10, "finding": "发现"}}, "ai_flavor_issues": [{"position": "位置", "original": "原文", "issue_type": "类型", "suggestion": "建议"}], "fix_priority": {"high": [{"item": "必须修改项"}], "medium": [{"item": "建议修改项"}], "low": [{"item": "可选优化项"}]}}'''
        prompt = ChatPromptTemplate.from_messages([
            ('system', _escape_lc_template(system_msg)),
            ('user', '请检查以下文章的真实性：\n\n{content}'),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={'content': content})

    def workspace_constraint_check(self, content: str, workspace: str) -> str:
        constraints = {
            'wechat': '段落≤150字/AI味<30%/需要封面图/中文标点/敏感词检查',
            'video': '高度口语化/AI味<20%/前3秒Hook/分镜标注/句长≤30字',
            'general': 'AI味<30%/段落≤500字/灵活配置'
        }
        constraint_desc = constraints.get(workspace, constraints['general'])

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位工作区规则检查专家。'),
            ('user', f'''请按照以下工作区约束规则检查文章：

工作区类型：{workspace}
约束规则：{constraint_desc}

文章内容：
{content}

请以JSON格式返回：
{{"workspace": "{workspace}", "passed": true/false, "violations": [{{"rule": "违反的规则", "position": "位置", "detail": "具体说明", "suggestion": "修改建议"}}], "stats": {{"total_words": 0, "avg_paragraph_length": 0, "estimated_ai_rate": 0, "longest_paragraph": 0}}}}''')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def generate_title(self, content: str, count: int = 5, platform: str = 'general') -> str:
        count = min(count, 10)
        platform_desc = PLATFORM_WHITELIST.get(platform, PLATFORM_WHITELIST['general'])
        seo_block = self._build_seo_constraints()
        seo_section = f'\n\nSEO 标题要求：\n{seo_block}' if seo_block else ''

        excerpt = content[:2000]
        if len(content) > 2500:
            excerpt += '\n...(省略中间部分)...\n' + content[-500:]

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位标题专家，擅长创作吸引人的文章标题。'),
            ('user', f'请为以下文章生成{count}个标题，风格：{platform_desc}{seo_section}\n\n文章内容：\n{excerpt}\n\n请以JSON格式返回：\n{{"titles": [{{"title": "标题1", "description": "简要说明"}}]}}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def _build_seo_constraints(self) -> str:
        """从 SEO 规则和标题公式配置构建标题创作约束"""
        parts: list[str] = []
        try:
            seo = get_seo_rules()
            title_cfg = seo.get('title', {})
            if title_cfg:
                min_c = title_cfg.get('min_chars', '')
                max_c = title_cfg.get('max_chars', '')
                if min_c and max_c:
                    parts.append(f'标题字数控制在 {min_c}-{max_c} 字之间')
                patterns = title_cfg.get('patterns', [])
                if patterns:
                    parts.append(f'标题应包含以下至少一种元素：{", ".join(patterns)}（如数字、反直觉结论、痛点等）')
        except Exception:
            pass  # 配置缺失不阻断

        try:
            formulas_cfg = get_title_formulas()
            formulas = formulas_cfg.get('formulas', [])
            if formulas:
                formula_names = [f.get('name', '') for f in formulas[:5] if f.get('name')]
                if formula_names:
                    parts.append(f'推荐标题公式：{", ".join(formula_names)}')

            banned = formulas_cfg.get('banned_title_words', [])
            if banned:
                parts.append(f'标题中禁止使用以下词汇：{"、".join(banned)}')
        except Exception:
            pass

        return '\n'.join(parts) if parts else ''

    def title_workshop(
        self,
        topic: str,
        outline: str,
        draft_excerpt: str,
        count: int = 5,
        platform: str = 'general',
        style_prompt: str = '',
    ) -> str:
        count = min(count, 10)
        platform_desc = PLATFORM_WHITELIST.get(platform, PLATFORM_WHITELIST['general'])
        style_block = f'\n\n作者风格要求：\n{style_prompt}' if style_prompt else ''
        seo_block = self._build_seo_constraints()
        seo_section = f'\n\nSEO 标题要求：\n{seo_block}' if seo_block else ''
        json_schema = (
            '{"titles": [{"title": "主标题", "subtitle": "副标题", "hook": "点击理由", '
            '"cover_line": "封面一句话"}], "recommended_index": 0}'
        )

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是爆款标题专家。标题需：痛点明确、可用数字、结果导向、适度情绪、可设悬念。'),
            ('user', (
                '为以下内容生成 {count} 个标题 + 每个标题的副标题 + 一句封面文案（cover_line）。\n\n'
                '平台风格：{platform_desc}\n'
                '{seo_section}'
                '选题：{topic}\n'
                '大纲摘要：\n{outline}\n\n'
                '正文摘要：\n{draft_excerpt}\n'
                '{style_block}\n\n'
                f'请以 JSON 返回：\n{_escape_lc_template(json_schema)}'
            )),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(
            chain,
            input_vars={
                'count': count,
                'platform_desc': platform_desc,
                'seo_section': seo_section,
                'topic': topic,
                'outline': outline[:1500],
                'draft_excerpt': draft_excerpt[:1200],
                'style_block': style_block,
            },
        )

    def generate_section(
        self,
        section_title: str,
        section_type: str,
        context: Dict[str, Any],
    ) -> str:
        style_block = context.get('style', '')
        research = context.get('research', '')
        prior = context.get('prior_sections', '')
        anti = context.get('anti_ai_rules', '')
        section_brief = (context.get('section_brief') or '').strip()
        intent = normalize_writing_intent(context.get('writing_intent'))
        brief_block = (context.get('writing_brief_block') or '').strip()
        quality_rules = get_section_writing_rules(
            intent,
            writing_brief_block=brief_block,
        )
        from ..utils_outline import truncate_text, writing_context_limits

        tw = int(context.get('target_word_count') or context.get('target_total_words') or 400)
        limits = writing_context_limits(tw)
        outline_index = truncate_text(
            (context.get('outline_index') or '').strip(),
            limits['outline_index_max'],
        )
        if not outline_index:
            full_outline = (context.get('full_outline') or '').strip()
            outline_index = truncate_text(full_outline, limits['outline_index_max'])
        section_index = context.get('section_index') or 0
        section_total = context.get('section_total') or 0
        target_words = int(context.get('target_word_count') or 0)
        if target_words <= 0:
            target_words = 400
        max_words = max(target_words + 40, int(target_words * 1.12))
        out_tokens = max_output_tokens_for_words(max_words)
        llm_bound = self.llm.bind(max_tokens=out_tokens)

        if section_type == 'experience':
            brief_block = f'\n本节大纲要点：\n{section_brief}' if section_brief else ''
            exp_prompt = ChatPromptTemplate.from_messages([
                ('system',
                 '你是专业写作者。用第一人称"我"写个人经验，必须具体、有细节、有数据、有反思。'
                 '像真人博客，不要AI腔。\n'
                 + quality_rules),
                ('user', f'''请撰写章节「{section_title}」（经验型，第一人称）。

【强制要求】
1. {section_opening_rule(section_title)}
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
{research if research else '（无）'}

{get_article_format_prompt()}

{get_section_length_instruction(target_words, max_words)}
只输出本节新正文；可用 1～2 句承接上文，勿复制前文段落、勿写其他章节。'''),
            ])
            chain = exp_prompt | llm_bound | StrOutputParser()
            raw = _invoke_with_retry(chain, input_vars={})
            return polish_generated_draft(raw)

        index_hint = ''
        if section_index and section_total:
            index_hint = f'\n当前进度：第 {section_index}/{section_total} 节。只写本节，禁止写其他章节。'

        prompt = ChatPromptTemplate.from_messages([
            ('system',
             '你是专业写作者。按大纲写深度评论，不是堆砌要点。\n'
             + quality_rules),
            ('user', f'''请撰写章节「{section_title}」。
{index_hint}

【强制要求】
1. {section_opening_rule(section_title)}
2. 必须覆盖下方「本节大纲要点」中的所有信息，不得另起话题
3. 不得写入其他章节的标题或内容
4. 不得跳过或合并章节；节首勿重复上一节已写过的句子

本节大纲要点（必须全部体现）：
{section_brief if section_brief else '（无额外要点，但仍须紧扣章节标题）'}

文章章节索引（勿写其他节）：
{outline_index or '（无）'}

章节类型：信息型（由 AI 撰写）
风格与约束：
{style_block}
{anti}

衔接参考（禁止复制到正文）：
{prior if prior else '（无）'}

参考资料（仅可引用此处已有事实，勿编造）：
{research if research else '（无）'}

{get_article_format_prompt()}

{get_section_length_instruction(target_words, max_words)}
只输出本节新段落；禁止「在当今/综上所述/值得注意的是」。'''),
        ])
        chain = prompt | llm_bound | StrOutputParser()
        raw = _invoke_with_retry(chain, input_vars={})
        return polish_generated_draft(raw)

    def judge_section(self, section_content: str, section_title: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是文章质量评审员。从清晰度、事实性、语气、去AI味四个维度打分。'),
            ('user', f'''评审章节「{section_title}」：

{section_content}

请以 JSON 返回：
{{"overall_score": 0-100, "weakest_dimension": "clarity|facts|tone|slop", "dimensions": {{"clarity": 0-100, "facts": 0-100, "tone": 0-100, "slop": 0-100}}, "issues": ["问题1"], "should_revise": true/false}}'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def revise_section(
        self,
        section_content: str,
        section_title: str,
        issues: list[str],
        style_prompt: str = '',
    ) -> str:
        issues_text = '\n'.join(f'- {i}' for i in issues) if issues else '- 降低AI味，增加具体细节'
        style_block = f'\n风格：{style_prompt}' if style_prompt else ''

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是修订专家。只改当前章节，保持事实不变。'),
            ('user', f'''请修订章节「{section_title}」。

待解决问题：
{issues_text}
{style_block}

原文：
{section_content}

请直接输出修订后的完整章节（Markdown）。'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def verify_claims(self, content: str, claims: list[dict]) -> str:
        claims_text = '\n'.join(
            f'- 主张: {c.get("text", "")} | 来源摘录: {c.get("source_quote", "无")}'
            for c in claims[:30]
        )
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是事实核查员。检查正文中的数据、人名、结论是否有来源支撑。'),
            ('user', f'''正文：
{content[:4000]}

已登记主张与来源：
{claims_text or '（无登记主张）'}

请以 JSON 返回：
{{"verified_count": 0, "unverified": [{{"text": "无来源的句子", "suggestion": "补充来源或改写"}}], "hallucination_risk": "low|medium|high", "summary": "总体说明"}}'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def apply_anti_ai_polish(self, content: str, style_prompt: str = '') -> str:
        style_block = f'\n{style_prompt}' if style_prompt else ''
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是去AI味编辑。删除套话，改口语，加具体细节，不改变核心事实。'),
            ('user', f'''请对下文做去AI味润色。禁止：在当今/随着/值得注意的是/综上所述/显著提升/不仅而且。
{get_anti_ai_style_prompt()}

{style_block}

原文：
{content}

请直接输出润色后全文（必须保留 Markdown 标题层级与 **加粗**）。'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})


def get_llm_service(
    provider: str = None,
    model_name: str = None,
    api_key: str = None,
    base_url: str = None,
    temperature: float = None,
) -> LLMService:
    cache_key = _get_cache_key(provider, api_key, model_name, base_url, temperature)

    if cache_key in _llm_cache:
        return _llm_cache[cache_key]

    service = LLMService(
        provider=provider,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature
    )

    if len(_llm_cache) >= MAX_CACHE_SIZE:
        oldest_key = next(iter(_llm_cache))
        del _llm_cache[oldest_key]
    _llm_cache[cache_key] = service

    return service
