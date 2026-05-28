"""通用装饰器和工具函数"""
import logging
from functools import wraps
from flask import request, jsonify
from .utils import parse_json_from_llm, translate_error, extract_llm_config, get_field
from .services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


def _snake_key(key: str) -> str:
    if key.startswith('_'):
        return key
    return ''.join(f'_{c.lower()}' if c.isupper() else c for c in key).lstrip('_')


def _format_llm_result(result):
    if hasattr(result, 'status_code'):
        return result
    if isinstance(result, str):
        parsed = parse_json_from_llm(result)
        return jsonify(parsed or {'raw_result': result})
    if isinstance(result, dict):
        return jsonify(result)
    return jsonify({'result': result})


def with_llm(f=None, *, require_content=True, content_key='content', content_keys=None):
    """
    统一 LLM 调用模板装饰器。

    @with_llm(require_content=False) 等价于原 @with_llm_optional。
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            data = request.json or {}

            if require_content:
                keys = content_keys or (content_key, _snake_key(content_key))
                if get_field(data, *keys) in (None, ''):
                    return jsonify({'error': f'{content_key} is required'}), 400

            try:
                cfg = extract_llm_config(data)
                llm = get_llm_service(
                    provider='custom',
                    model_name=cfg['model_name'],
                    api_key=cfg['api_key'],
                    base_url=cfg['base_url'],
                    temperature=cfg['temperature'],
                )
                return _format_llm_result(func(llm, data, *args, **kwargs))
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
            except Exception as e:
                logger.error(f'LLM call failed in {func.__name__}: {e}', exc_info=True)
                return jsonify({'error': translate_error(e)}), 500

        return wrapper

    if f is not None:
        return decorator(f)
    return decorator
