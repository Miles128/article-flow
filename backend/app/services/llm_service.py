import os
from typing import Optional, Dict, Any, List
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

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
                raise ValueError('API Key is required. Please configure LLM settings first.')
            
            base_url = self.base_url or os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
            
            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=self.temperature
            )
        
        elif self.provider == 'openai':
            from langchain_openai import ChatOpenAI
            api_key = self.api_key or os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError('OPENAI_API_KEY is not set')
            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=self.base_url,
                temperature=self.temperature
            )
        elif self.provider == 'anthropic':
            from langchain_anthropic import ChatAnthropic
            api_key = self.api_key or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError('ANTHROPIC_API_KEY is not set')
            return ChatAnthropic(
                model=self.model_name,
                api_key=api_key,
                temperature=self.temperature
            )
        elif self.provider == 'zhipu':
            from langchain_openai import ChatOpenAI
            api_key = self.api_key or os.getenv('ZHIPU_API_KEY')
            if not api_key:
                raise ValueError('ZHIPU_API_KEY is not set')
            base_url = self.base_url or 'https://open.bigmodel.cn/api/paas/v4/'
            return ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url=base_url,
                temperature=self.temperature
            )
        else:
            raise ValueError(f'Unknown provider: {self.provider}')
    
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
        return chain.invoke(langchain_messages, **kwargs)
    
    def generate_topic_ideas(self, keyword: str, count: int = 5) -> List[Dict[str, Any]]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位资深的内容策划专家，擅长挖掘热门话题和创作选题。'),
            ('user', f'基于关键词"{keyword}"，请提供{count}个有潜力的文章选题。每个选题包含：标题、简短描述、3个相关标签、预估热度分数（1-100）。\n\n请以JSON格式返回，格式如下：\n{{"topics": [{{"title": "选题标题", "description": "描述", "tags": ["标签1", "标签2", "标签3"], "heat_score": 80}}]}}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return result
    
    def generate_outline(self, topic: str, target_word_count: int = 2000) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的文章结构设计师，擅长构建逻辑清晰、层次分明的文章大纲。'),
            ('user', f'请为以下主题生成一个详细的文章大纲，目标字数约{target_word_count}字：\n\n主题：{topic}\n\n请以JSON格式返回，格式如下：\n{{"title": "文章标题", "nodes": [{{"id": 1, "title": "章节标题", "content": "内容概要", "children": [...]}}]}}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return result
    
    def continue_writing(self, current_content: str, context: Dict = None) -> str:
        context_str = ''
        if context:
            context_str = f'\n\n写作背景信息：\n- 主题：{context.get("topic", "")}\n- 目标读者：{context.get("audience", "")}\n- 风格要求：{context.get("style", "")}'
        
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的写作助手，擅长续写文章，保持原文风格和逻辑连贯性。'),
            ('user', f'请继续续写以下文章内容：\n\n{current_content}{context_str}\n\n请直接续写，保持与前文一致的风格和语气。')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({})
    
    def polish_content(self, content: str, style: str = 'professional') -> str:
        style_descriptions = {
            'professional': '正式专业，适合商务和专业文章',
            'casual': '轻松随意，适合博客和社交媒体',
            'conversational': '对话式，适合公众号和个人分享',
            'academic': '学术严谨，适合论文和研究报告'
        }
        
        style_desc = style_descriptions.get(style, style_descriptions['professional'])
        
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位资深的编辑和写作顾问，擅长润色文章，提升表达质量。'),
            ('user', f'请润色以下文章内容，要求风格：{style_desc}\n\n原文：\n{content}\n\n请输出润色后的完整文章，保持原意不变，优化表达、语法和流畅度。')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({})
    
    def check_grammar(self, content: str) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的中文语法检查专家，擅长发现并修正语法错误、用词不当和标点问题。'),
            ('user', f'请检查以下文章的语法和用词问题：\n\n{content}\n\n请以JSON格式返回，格式如下：\n{{"issues": [{{"type": "语法错误/用词不当/标点问题", "position": "位置描述", "original": "原文", "suggestion": "修改建议", "explanation": "解释"}}], "corrected_content": "修正后的完整内容"}}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return result
    
    def summarize_content(self, content: str, max_length: int = 200) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位专业的内容摘要专家，擅长提炼核心要点。'),
            ('user', f'请为以下内容生成摘要，字数不超过{max_length}字：\n\n{content}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({})
    
    def extract_keywords(self, content: str, count: int = 5) -> List[str]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位关键词提取专家，擅长从文章中提取最有价值的关键词。'),
            ('user', f'请从以下文章中提取{count}个核心关键词：\n\n{content}\n\n请直接返回关键词列表，用逗号分隔。')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return [k.strip() for k in result.split(',')]
    
    def analyze_ai_taste(self, content: str) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位AI内容检测专家，擅长识别文章的AI写作痕迹。从以下维度分析：1) 连接词使用频率；2) 套话使用情况；3) 句式多样性；4) 情感表达自然度。'),
            ('user', f'请分析以下文章的AI痕迹：\n\n{content}\n\n请以JSON格式返回：\n{{"score": 0-100, "dimensions": {{"connector_ratio": 0-100, "cliche_ratio": 0-100, "sentence_variety": 0-100, "emotion_naturalness": 0-100}}, "suggestions": ["建议1", "建议2"]}}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return result
    
    def check_compliance(self, content: str) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ('system', '你是一位内容合规检查专家，擅长识别敏感内容、违规信息和潜在风险。'),
            ('user', f'请检查以下文章内容的合规性：\n\n{content}\n\n请以JSON格式返回：\n{{"is_compliant": true/false, "risk_level": "low/medium/high", "issues": [{{"type": "风险类型", "position": "位置", "description": "描述", "suggestion": "建议"}}], "suggestions": ["整体建议"]}}')
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        result = chain.invoke({})
        return result
    
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
        return chain.invoke({})


def get_llm_service(
    provider: str = None, 
    model_name: str = None,
    api_key: str = None,
    base_url: str = None,
    temperature: float = None
) -> LLMService:
    return LLMService(
        provider=provider,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature
    )
