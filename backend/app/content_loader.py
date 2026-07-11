"""内容层配置加载（frameworks / prompts / rubric / gate）"""
import os
import yaml
from functools import lru_cache

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config')
CONTENT_DIR = os.path.join(CONFIG_DIR, 'content')


@lru_cache(maxsize=32)
def load_content_yaml(name: str) -> dict:
    path = os.path.join(CONTENT_DIR, name)
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def get_frameworks() -> dict:
    data = load_content_yaml('frameworks.yaml')
    return data.get('frameworks', {})


def get_platform_prompts() -> dict:
    data = load_content_yaml('platform_prompts.yaml')
    return data


def get_eval_rubric() -> dict:
    return load_content_yaml('eval_rubric.yaml')


def get_publish_gate() -> dict:
    return load_content_yaml('publish_gate.yaml')


def get_seo_rules() -> dict:
    return load_content_yaml('seo_rules.yaml')


def get_title_formulas() -> dict:
    return load_content_yaml('title_formulas.yaml')


def get_humanize_checklist() -> dict:
    return load_content_yaml('humanize_checklist.yaml')


def clear_content_cache() -> None:
    load_content_yaml.cache_clear()
