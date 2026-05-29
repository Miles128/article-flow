"""按浓度百分比生成风格 prompt（配置见 writing_styles.yaml）"""
from __future__ import annotations

from ..config_loader import get_writing_style_catalog

# 易「粘住」、难以靠切回正式自动褪去的文体
ORNAMENTAL_STYLE_IDS = frozenset({'poetic', 'humorous', 'casual'})
STYLE_ID_ALIASES: dict[str, str] = {'conversational': 'casual'}


def normalize_style_id(style_id: str) -> str:
    return STYLE_ID_ALIASES.get(style_id, style_id)
# 可作为「归正」目标的克制书面体
PLAIN_STYLE_IDS = frozenset({'professional', 'academic'})


def _intensity_global() -> dict:
    catalog = get_writing_style_catalog()
    g = catalog.get('intensity') or {}
    return {
        'default': int(g.get('default', 45)),
        'min': int(g.get('min', 15)),
        'max': int(g.get('max', 85)),
    }


def get_style_meta(style_id: str) -> dict | None:
    style_id = normalize_style_id(style_id)
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
            '仍以客观、清晰、可读为主；保留原句句式与信息量，'
            '只替换个别用词，禁止整句换腔、禁止第二人称与连环设问。'
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
    elif label == '诗意' or '诗意' in base:
        extra = ' 诗意专项：意象与节奏点到为止，禁止堆砌比喻、排比、空灵套话。'
    return f'{degree}\n文体基調：{base}{extra}'


def get_destylize_instruction(
    target_style_id: str,
    *,
    force: bool = False,
) -> str:
    """仅「恢复正式」等显式归正时启用，避免按大纲写稿时把正文改碎。"""
    if not force or target_style_id not in PLAIN_STYLE_IDS:
        return ''
    return (
        '【归正正文（高于一般润色，必须执行）】\n'
        '若原文带诗意、幽默、口语、对话体或修辞堆砌：一律改回克制、清晰的书面语。\n'
        '删除或改写：密集比喻/意象、排比煽情、连续设问、叹号、'
        '「仿佛/宛如/恰似/涤荡/镌刻/交织」等文艺套话。\n'
        '保留全部事实、论点与顺序；不追求华丽，以可读、可论证为准。'
    )


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
