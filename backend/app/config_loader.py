"""YAML 配置加载器"""
import os
import yaml
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config')


@lru_cache(maxsize=32)
def load_config(filename: str) -> dict:
    """加载 YAML 配置文件（带缓存）"""
    filepath = os.path.join(CONFIG_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f'Config file not found: {filepath}')
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f'Failed to load config {filename}: {e}')
        return {}


def get_writing_modes() -> dict:
    """获取写作模式配置"""
    config = load_config('writing_modes.yaml')
    return config.get('modes', {})


def get_writing_style_catalog() -> dict:
    """目标风格目录（writing_styles.yaml）。"""
    return load_config('writing_styles.yaml')


def get_writing_styles() -> dict[str, str]:
    """style id → 注入 prompt 的完整描述。"""
    catalog = get_writing_style_catalog()
    raw = catalog.get('styles') or {}
    out: dict[str, str] = {}
    for sid, meta in raw.items():
        if isinstance(meta, dict):
            out[sid] = str(meta.get('prompt') or meta.get('description') or sid)
        else:
            out[sid] = str(meta)
    return out


def get_default_writing_style() -> str:
    catalog = get_writing_style_catalog()
    default = catalog.get('default') or 'professional'
    if default in get_writing_styles():
        return default
    keys = list(get_writing_styles().keys())
    return keys[0] if keys else 'professional'


def get_style_intensity_global() -> dict[str, int]:
    g = get_writing_style_catalog().get('intensity') or {}
    return {
        'default': int(g.get('default', 45)),
        'min': int(g.get('min', 15)),
        'max': int(g.get('max', 85)),
    }


def get_writing_styles_api_payload() -> dict:
    """GET /writing/styles 响应体。"""
    catalog = get_writing_style_catalog()
    raw = catalog.get('styles') or {}
    ig = get_style_intensity_global()
    styles: list[dict[str, int | str]] = []
    for sid, meta in raw.items():
        if isinstance(meta, dict):
            styles.append({
                'id': sid,
                'label': str(meta.get('label') or sid),
                'description': str(meta.get('description') or ''),
                'default_intensity': int(
                    meta.get('default_intensity') or ig['default'],
                ),
                'max_intensity': int(meta.get('max_intensity') or ig['max']),
            })
        else:
            styles.append({
                'id': sid,
                'label': sid,
                'description': str(meta),
                'default_intensity': ig['default'],
                'max_intensity': ig['max'],
            })
    return {
        'default': get_default_writing_style(),
        'intensity': ig,
        'styles': styles,
    }


def get_writing_rhythm_limits() -> dict:
    """长句/长段约束参数。"""
    rules = get_anti_ai_rules()
    rhythm = rules.get('writing_rhythm') or {}
    limits = rules.get('style_limits') or {}
    return {
        'max_sentence_chars': int(
            rhythm.get('max_sentence_chars') or limits.get('long_sentence_chars') or 28
        ),
        'max_paragraph_chars': int(rhythm.get('max_paragraph_chars') or 140),
        'max_sentences_per_paragraph': int(rhythm.get('max_sentences_per_paragraph') or 3),
    }


def get_review_passes() -> dict:
    """获取审校轮次配置"""
    config = load_config('review_passes.yaml')
    return config.get('passes', {})


def get_ai_cliche_db() -> dict:
    """获取 AI 套话库"""
    config = load_config('review_passes.yaml')
    return config.get('ai_cliche_db', {})


def get_audit_flows() -> list:
    """获取审核流程配置"""
    config = load_config('review_passes.yaml')
    return config.get('audit_flows', [])


def get_platforms() -> list:
    """获取平台配置"""
    config = load_config('platforms.yaml')
    return config.get('platforms', [])


def get_workspaces() -> list:
    """获取工作区配置"""
    config = load_config('workspaces.yaml')
    return config.get('workspaces', [])


def get_anti_ai_rules() -> dict:
    """获取去 AI 味规则配置"""
    return load_config('anti_ai_rules.yaml')


def get_seo_rules() -> dict:
    """获取 SEO 规则配置（标题字数、关键词、可读性）"""
    config = load_config('content/seo_rules.yaml')
    return config


def get_title_formulas() -> dict:
    """获取标题公式配置"""
    config = load_config('content/title_formulas.yaml')
    return config


def clear_cache():
    """清除配置缓存（热更新时使用）"""
    load_config.cache_clear()
