"""通用工具函数"""
import json
import re
import logging

logger = logging.getLogger(__name__)


def parse_json_from_llm(text: str) -> dict:
    """从 LLM 返回的文本中解析 JSON，改进正则匹配"""
    if not text:
        return {}

    # 先尝试直接解析
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # 尝试提取 JSON 代码块（```json ... ```）
    code_block_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except (json.JSONDecodeError, TypeError):
            pass

    # 尝试提取花括号内的 JSON（非贪婪匹配，取最内层）
    # 优先匹配最内层的 { ... }，避免贪婪匹配跨越多个对象
    brace_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except (json.JSONDecodeError, TypeError):
            pass

    # 最后尝试贪婪匹配作为 fallback
    greedy_match = re.search(r'\{[\s\S]*\}', text)
    if greedy_match:
        try:
            return json.loads(greedy_match.group())
        except (json.JSONDecodeError, TypeError):
            pass

    logger.warning(f'Failed to parse JSON from LLM response: {text[:200]}...')
    return {}


def translate_error(error: Exception) -> str:
    """将异常信息翻译为用户友好的中文提示"""
    msg = str(error).lower()
    if 'arrearage' in msg or 'overdue' in msg or '欠费' in msg:
        return 'API 账号欠费，请充值后重试'
    if 'invalid_api_key' in msg or 'invalid api key' in msg or 'incorrect api key' in msg:
        return 'API Key 无效，请检查设置'
    if 'permissiondenied' in msg or 'unsupported_country_region' in msg or 'request_forbidden' in msg:
        return '当前网络无法直连 OpenAI，请在 backend/.env 配置可用的 LLM_BASE_URL（代理地址）'
    if 'authentication' in msg and ('api' in msg or 'denied' in msg or 'failed' in msg):
        return 'API Key 无效，请检查设置'
    if 'rate_limit' in msg or 'rate limit' in msg or 'too many requests' in msg:
        return '请求过于频繁，请稍后重试'
    if 'insufficient_quota' in msg or 'quota' in msg or 'billing' in msg:
        return 'API 额度不足，请充值或更换 Key'
    if 'model_not_found' in msg or 'model not found' in msg or 'does not exist' in msg:
        return '模型不存在，请检查模型名称'
    if 'connection' in msg or 'timeout' in msg or 'timed out' in msg:
        return '网络连接失败，请检查网络或 API 地址'
    if 'context_length' in msg or 'too many tokens' in msg or 'max_tokens' in msg:
        return '内容过长，超出模型处理限制'
    logger.debug(f'Untranslated error: {error}')
    return '服务暂时不可用，请稍后重试'


def get_field(data: dict | None, *keys: str, default=None):
    """读取 JSON 字段，兼容 snake_case 与 camelCase。"""
    if not data:
        return default
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def get_query_arg(args, *keys: str, default: str | None = None) -> str | None:
    """读取 query 参数，兼容 snake_case 与 camelCase。"""
    for key in keys:
        val = args.get(key)
        if val is not None and str(val).strip() != '':
            return str(val)
    return default


def extract_llm_config(data: dict | None = None) -> dict:
    """从环境变量读取 LLM 配置。API Key 仅在后端 .env 配置。"""
    import os
    temp_raw = os.getenv('LLM_TEMPERATURE', '0.7')
    try:
        temperature = float(temp_raw)
    except ValueError:
        temperature = 0.7
    api_key = os.getenv('LLM_API_KEY')
    if not api_key:
        raise ValueError('请在后端 backend/.env 中配置 LLM_API_KEY')
    return {
        'api_key': api_key,
        'base_url': os.getenv('LLM_BASE_URL', 'https://api.openai.com/v1'),
        'model_name': os.getenv('LLM_MODEL_NAME', 'gpt-4o-mini'),
        'temperature': temperature,
    }
