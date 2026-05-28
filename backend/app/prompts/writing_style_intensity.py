"""按浓度百分比生成风格 prompt（配置见 writing_styles.yaml）"""
from __future__ import annotations

from ..config_loader import get_writing_style_catalog


def _intensity_global() -> dict:
    catalog = get_writing_style_catalog()
    g = catalog.get('intensity') or {}
    return {
        'default': int(g.get('default', 45)),
        'min': int(g.get('min', 15)),
        'max': int(g.get('max', 85)),
    }


def get_style_meta(style_id: str) -> dict | None:
    raw = get_writing_style_catalog().get('styles') or {}
    meta = raw.get(style_id)
    if not meta:
        return None
    if isinstance(meta, str):
        return {'prompt': meta, 'label': style_id}
    return dict(meta)


def resolve_style_intensity(style_id: str, requested: int | None) -> int:
    """将请求浓度钳制到全局与各风格上限内。"""
    g = _intensity_global()
    meta = get_style_meta(style_id) or {}
    lo = g['min']
    hi = g['max']
    style_max = int(meta.get('max_intensity') or hi)
    cap = min(hi, style_max)
    default = int(meta.get('default_intensity') or g['default'])
    raw = default if requested is None else int(requested)
    return max(lo, min(cap, raw))


def _band_instruction(pct: int, label: str, base: str) -> str:
    if pct <= 30:
        degree = (
            f'风格浓度约 {pct}%（轻微）：仅轻微体现「{label}」倾向，'
            '仍以客观、清晰、可读为主，勿用力过猛。'
        )
    elif pct <= 55:
        degree = (
            f'风格浓度约 {pct}%（适度）：明显但克制地体现「{label}」，'
            '与通用书面表达平衡，勿盖过论点与事实。'
        )
    else:
        degree = (
            f'风格浓度约 {pct}%（偏强）：较强体现「{label}」，'
            '仍禁止夸张、段子堆砌、网络烂梗与歪曲事实。'
        )
    extra = ''
    if label == '幽默' or '幽默' in base:
        extra = ' 幽默专项：禁止连续玩笑、禁止为搞笑牺牲逻辑与信息密度。'
    elif label == '正式' or '正式' in base:
        extra = ' 正式专项：避免口语废话与过度敬语堆砌。'
    return f'{degree}\n文体基調：{base}{extra}'


def format_style_prompt(style_id: str, intensity: int | None = None) -> str:
    meta = get_style_meta(style_id)
    if not meta:
        return ''
    pct = resolve_style_intensity(style_id, intensity)
    label = str(meta.get('label') or style_id)
    base = str(meta.get('prompt') or meta.get('description') or style_id)
    return _band_instruction(pct, label, base)


def parse_style_intensity_from_data(data: dict) -> int | None:
    for key in ('style_intensity', 'styleIntensity'):
        if key in data and data[key] is not None:
            try:
                return int(data[key])
            except (TypeError, ValueError):
                return None
    ctx = data.get('context') or {}
    if isinstance(ctx, dict):
        for key in ('style_intensity', 'styleIntensity'):
            if key in ctx and ctx[key] is not None:
                try:
                    return int(ctx[key])
                except (TypeError, ValueError):
                    return None
    return None
