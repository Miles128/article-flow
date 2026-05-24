"""LLM 服务管理器 - 实例缓存 + 超时控制 + 重试"""
import os
import time
import logging
from typing import Dict, Any, List
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)


def _escape_lc_template(text: str) -> str:
    """LangChain ChatPromptTemplate 字面量大括号转义。"""
    return text.replace('{', '{{').replace('}', '}}')


_llm_cache: Dict[str, 'LLMService'] = {}

DEFAULT_REQUEST_TIMEOUT = 120
MAX_CACHE_SIZE = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1

# 允许的 style 白名单（防止 Prompt Injection）
STYLE_WHITELIST = {
    'formal': '正式专业风格，适合商务和专业文章',
    'casual': '轻松随意风格，适合博客和社交媒体',
    'conversational': '对话式风格，像和朋友聊天一样',
    'academic': '学术严谨风格，适合论文和研究报告',
    'poetic': '诗意优美风格，富有文学性',
    'humorous': '幽默风趣风格，轻松活泼',
    'professional': '正式专业，适合商务和专业文章',
}

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

    def polish_content(self, content: str, style: str = 'professional') -> str:
        # 安全校验 style
        style_desc = STYLE_WHITELIST.get(style, STYLE_WHITELIST['professional'])

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位资深的编辑和写作顾问，擅长润色文章，提升表达质量。'),
            ('user', f'请润色以下文章内容，要求风格：{style_desc}\n\n原文：\n{content}\n\n请输出润色后的完整文章，保持原意不变，优化表达、语法和流畅度。')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def rewrite_content(self, content: str, style: str) -> str:
        # 安全校验 style - 防止 Prompt Injection
        style_desc = STYLE_WHITELIST.get(style)
        if not style_desc:
            raise ValueError(f'不支持的风格类型: {style}。可选: {", ".join(STYLE_WHITELIST.keys())}')

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的写作风格转换专家。'),
            ('user', f'请将以下内容重写为{style_desc}：\n\n原文：\n{content}\n\n请直接输出重写后的内容，保持原意不变，只改变表达风格。')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

    def apply_writing_instruction(self, content: str, instruction: str, style_note: str = '') -> str:
        style_block = f'\n\n写作风格参考：\n{style_note}' if style_note else ''
        prompt = ChatPromptTemplate.from_messages([
            (
                'system',
                '你是一位资深编辑。根据用户的整体修改要求改写全文，保留核心事实与结构，'
                '避免「在当今/随着/值得注意的是/综上所述」等 AI 套话。只输出修改后的正文。',
            ),
            (
                'user',
                '整体修改要求：\n{instruction}\n\n原文：\n{content}{style_block}'
                '\n\n请直接输出修改后的完整文章，不要解释。',
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
        research = (context.get('research') or '')[:3000]
        anti = context.get('anti_ai_rules', '')
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的文档撰写专家。必须严格按给定大纲的章节顺序与要点写作，不得遗漏章节，不得另起话题。'),
            ('user', f'''请严格按照以下大纲生成完整文章（Markdown）：

{outline}

参考资料（可引用，勿编造）：
{research if research else '（无）'}

{anti}

【强制要求】
1. 大纲中的每个章节标题都必须出现在正文中（## 标题，逐字一致）
2. 每个章节下的要点说明必须全部体现
3. 不得跳过、合并或重排章节
4. 保持全篇术语与数据口径一致'''),
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
            system_msg = '''你是风格审校与降AI味专家。请审校以下文章，聚焦：
1. 口语化改造 - 书面语转口语表达
2. 增加具体细节 - 抽象描述转具体场景
3. 加入个人观点 - 客观陈述转主观偏好
4. 打破机械结构 - 对称列表转自然叙述
5. 使用反差转折 - 单一调性转有起伏

AI套话库（必须消除）：在当今/随着/值得注意的是/综上所述/不仅...而且/显著提升/充分利用/有效改善/深入了解/经过深入分析

请以JSON格式返回：
{"ai_taste_score": 0-100, "issues": [{"type": "套话/书面语/AI句式/抽象表达", "position": "位置", "original": "原文", "suggestion": "改写建议", "severity": "high|medium|low"}], "corrected_content": "去AI味后的全文", "before_after": {"before_score": 0-100, "after_score": 0-100, "improvement": "改善幅度描述"}}'''

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

        excerpt = content[:2000]
        if len(content) > 2500:
            excerpt += '\n...(省略中间部分)...\n' + content[-500:]

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位标题专家，擅长创作吸引人的文章标题。'),
            ('user', f'请为以下文章生成{count}个标题，风格：{platform_desc}\n\n文章内容：\n{excerpt}\n\n请以JSON格式返回：\n{{"titles": [{{"title": "标题1", "description": "简要说明"}}]}}')
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

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
        json_schema = (
            '{"titles": [{"title": "主标题", "subtitle": "副标题", "hook": "点击理由", '
            '"cover_line": "封面一句话"}], "recommended_index": 0}'
        )

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是爆款标题专家。标题需：痛点明确、可用数字、结果导向、适度情绪、可设悬念。'),
            ('user', (
                '为以下内容生成 {count} 个标题 + 每个标题的副标题 + 一句封面文案（cover_line）。\n\n'
                '平台风格：{platform_desc}\n'
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
        full_outline = (context.get('full_outline') or '').strip()
        section_index = context.get('section_index') or 0
        section_total = context.get('section_total') or 0

        if section_type == 'experience':
            brief_block = f'\n本节大纲要点：\n{section_brief}' if section_brief else ''
            return (
                f'## {section_title}\n\n'
                f'（此节为「经验型」，请根据引导问题自行填写真实经历与观点）\n\n'
                f'引导问题：\n'
                f'1. 你第一次遇到这个问题的具体场景是什么？\n'
                f'2. 当时你做了什么？结果如何？\n'
                f'3. 如果重来，你会怎么改？\n'
                f'{brief_block}\n'
            )

        index_hint = ''
        if section_index and section_total:
            index_hint = f'\n当前进度：第 {section_index}/{section_total} 节。只写本节，禁止写其他章节。'

        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是专业写作者。必须严格按大纲撰写，不得偏离章节范围，不得省略大纲要点。'),
            ('user', f'''请撰写章节「{section_title}」。
{index_hint}

【强制要求】
1. 正文必须以 ## {section_title} 开头（标题逐字一致）
2. 必须覆盖下方「本节大纲要点」中的所有信息，不得另起话题
3. 不得写入其他章节的标题或内容
4. 不得跳过或合并章节

本节大纲要点（必须全部体现）：
{section_brief if section_brief else '（无额外要点，但仍须紧扣章节标题）'}

完整文章大纲（仅供定位，不要写其他节）：
{full_outline[:4000] if full_outline else '（无）'}

章节类型：信息型（由 AI 撰写）
风格与约束：
{style_block}
{anti}

前文已写（保持衔接，勿重复）：
{prior[-2500:] if prior else '（无）'}

参考资料（可引用，勿编造）：
{research[:3000] if research else '（无）'}

要求：Markdown 格式；300-600字；具体例子与数据；禁止「在当今/综上所述/值得注意的是」。'''),
        ])
        chain = prompt | self.llm | StrOutputParser()
        return _invoke_with_retry(chain, input_vars={})

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

{style_block}

原文：
{content}

请直接输出润色后全文。'''),
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
