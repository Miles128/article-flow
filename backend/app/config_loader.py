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


def get_writing_styles() -> dict:
    """获取写作风格白名单"""
    config = load_config('writing_modes.yaml')
    return config.get('styles', {})


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


def clear_cache():
    """清除配置缓存（热更新时使用）"""
    load_config.cache_clear()
