"""按浓度交叉加权：只改写部分句子，其余原样保留；支持逐句流式输出。"""
from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any

from ..article_format import get_article_format_prompt
from ..prompts.writing_intent import allows_literary_rhetoric, normalize_writing_intent
from ..prompts.writing_style_intensity import (
    format_style_prompt,
    normalize_style_id,
    resolve_style_intensity,
)
from .llm_streaming import build_text_chain, iter_chain_text

logger = logging.getLogger(__name__)

FULL_REWRITE_MIN_PCT = 95
APPLICATION_TIERS: tuple[dict[str, int | str], ...] = (
    {'id': 'light', 'center': 25},
    {'id': 'medium', 'center': 50},
    {'id': 'strong', 'center': 75},
)
TIER_ELIGIBILITY_SLACK = 8
TIER_WEIGHT_EPSILON = 15

_CLICHE_MARKERS: tuple[str, ...] = (
    '在当今',
    '随着',
    '值得注意的是',
    '综上所述',
    '显著提升',
    '不可或缺',
    '深度融合',
    '赋能',
    '助力',
    '旨在',
)

_PARA_BREAK = re.compile(r'\n{2,}')
_SENT_IN_LINE = re.compile(r'[^。！？!?…]+[。！？!?…]?')


@dataclass(frozen=True)
class TextUnit:
    index: int
    text: str
    suffix: str


@dataclass(frozen=True)
class CrossWeights:
    cover: float
    light: float
    medium: float
    strong: float


@dataclass(frozen=True)
class RewriteAssignment:
    unit_index: int
    tier_center: int


@dataclass(frozen=True)
class SelectiveRewriteStats:
    selective: bool
    unit_count: int
    planned_count: int
    rewritten_count: int
    target_pct: int
    cover_ratio: float


def should_use_selective_rewrite(
    style_id: str,
    intensity: int | None,
    *,
    restore_plain: bool = False,
) -> bool:
    if restore_plain:
        return False
    if intensity is not None and int(intensity) >= FULL_REWRITE_MIN_PCT:
        return False
    pct = resolve_style_intensity(style_id, intensity)
    return pct < FULL_REWRITE_MIN_PCT


def compute_cover(pct: int) -> float:
    """参与改写的句子占比上限；低浓度与 UI 百分比大致对齐。"""
    p = max(0, min(100, pct))
    if p <= 0:
        return 0.0
    if p <= 30:
        return p / 100.0
    if p <= 60:
        return 0.3 + 0.3 * (p - 30) / 30.0
    return 0.6 + 0.35 * (p - 60) / 40.0


def compute_cross_weights(pct: int) -> CrossWeights:
    cover = compute_cover(pct)
    if cover <= 0:
        return CrossWeights(0.0, 0.0, 0.0, 0.0)

    eligible = [
        t for t in APPLICATION_TIERS
        if pct >= int(t['center']) - TIER_ELIGIBILITY_SLACK
    ]
    if not eligible:
        eligible = [APPLICATION_TIERS[0]]

    raw: dict[str, float] = {
        str(t['id']): max(0.0, float(pct - int(t['center']) + TIER_WEIGHT_EPSILON))
        for t in eligible
    }
    total = sum(raw.values()) or 1.0
    return CrossWeights(
        cover=cover,
        light=cover * raw.get('light', 0.0) / total,
        medium=cover * raw.get('medium', 0.0) / total,
        strong=cover * raw.get('strong', 0.0) / total,
    )


def _units_from_paragraph_block(
    block: str,
    start_idx: int,
    *,
    min_chars: int = 2,
) -> list[TextUnit]:
    """段内按句切分；段内单换行挂在上一句 suffix 上。"""
    if not block:
        return []
    units: list[TextUnit] = []
    idx = start_idx
    lines = block.split('\n')
    for line_i, line in enumerate(lines):
        line_break = '\n' if line_i < len(lines) - 1 else ''
        if not line.strip():
            if line_break and units:
                prev = units[-1]
                units[-1] = TextUnit(prev.index, prev.text, prev.suffix + line_break)
            continue
        line_units: list[TextUnit] = []
        for m in _SENT_IN_LINE.finditer(line):
            seg = m.group(0)
            mm = re.match(r'^(.*?)([。！？!?…]+)?$', seg)
            if not mm:
                continue
            text = mm.group(1) or ''
            if len(text.strip()) < min_chars and not text.strip().startswith(
                ('#', '-', '*', '>'),
            ):
                continue
            line_units.append(TextUnit(idx, text, mm.group(2) or ''))
            idx += 1
        if line_break and line_units:
            last = line_units[-1]
            line_units[-1] = TextUnit(last.index, last.text, last.suffix + line_break)
        units.extend(line_units)
    return units


def split_text_units(body: str, *, min_chars: int = 2) -> tuple[str, list[TextUnit]]:
    """
    拆成可改写单元，保留：
    - 段间空行（\\n\\n+）→ 上一段末句 suffix
    - 段内换行（\\n）→ 上一行末句 suffix
    - 句末标点 → suffix，不写入 text
    返回 (文首空白/换行, 单元列表)。
    """
    if not body:
        return '', []
    normalized = body.replace('\r\n', '\n')
    leading = ''
    lead_m = re.match(r'^(\n+)', normalized)
    if lead_m:
        leading = lead_m.group(1)
        normalized = normalized[len(leading):]

    units: list[TextUnit] = []
    idx = 0
    pos = 0
    while pos <= len(normalized):
        break_m = _PARA_BREAK.search(normalized, pos)
        if break_m:
            block_end = break_m.start()
            para_sep = break_m.group(0)
            next_pos = break_m.end()
        else:
            block_end = len(normalized)
            para_sep = ''
            next_pos = len(normalized)

        block = normalized[pos:block_end]
        pos = next_pos
        block_units = _units_from_paragraph_block(block, idx, min_chars=min_chars)
        if block_units and para_sep:
            last = block_units[-1]
            block_units[-1] = TextUnit(
                last.index,
                last.text,
                last.suffix + para_sep,
            )
        units.extend(block_units)
        idx = len(units)
        if next_pos >= len(normalized):
            break

    return leading, units


def join_text_units(
    units: list[TextUnit],
    replacements: dict[int, str],
    *,
    leading: str = '',
) -> str:
    chunks: list[str] = []
    if leading:
        chunks.append(leading)
    for u in units:
        text = replacements.get(u.index, u.text)
        chunks.append(text + u.suffix)
    return ''.join(chunks)


def _normalize_replacement_text(unit: TextUnit, rewritten: str) -> str:
    """去掉模型多写的句末标点，避免与 suffix 重复；禁止改写带入换行。"""
    new = re.sub(r'[\r\n]+', ' ', (rewritten or '')).strip()
    if not new:
        return unit.text
    if unit.suffix and re.match(r'^[。！？!?…]', unit.suffix):
        new = re.sub(r'[。！？!?…]+\s*$', '', new)
    return new


def score_unit_for_style(
    text: str,
    style_id: str,
    *,
    writing_intent: str | None = None,
) -> float:
    score = 0.0
    compact = re.sub(r'\s+', '', text)
    intent = normalize_writing_intent(writing_intent)
    preserve_rhetoric = allows_literary_rhetoric(intent) or style_id == 'poetic'
    for marker in _CLICHE_MARKERS:
        if marker in text:
            score += 2.0
    if len(compact) > 80:
        score += 1.0
    elif len(compact) < 12:
        score -= 2.5
    if re.search(r'\d+[%％]?|\d{4}年', text):
        score -= 1.5
    if re.search(r'[A-Za-z]{2,}|\d+\.\d+', text):
        score -= 0.8
    if style_id in ('professional', 'academic') and not preserve_rhetoric:
        if re.search(r'[！!]{2,}|哈哈|呢|吧|啦', text):
            score += 1.2
        if '仿佛' in text or '宛如' in text or '恰似' in text:
            score += 1.5
    if style_id in ('humorous', 'casual'):
        if len(compact) > 60 and '，' in text:
            score += 0.6
    return score


def plan_rewrite_assignments_for_units(
    units: list[TextUnit],
    pct: int,
    style_id: str,
    *,
    writing_intent: str | None = None,
) -> list[RewriteAssignment]:
    n = len(units)
    if n <= 0:
        return []
    weights = compute_cross_weights(pct)
    total_pick = max(0, min(n, round(n * weights.cover)))
    if total_pick <= 0:
        return []

    tier_quotas: list[tuple[int, int]] = []
    if weights.cover > 0:
        for tier in APPLICATION_TIERS:
            tid = str(tier['id'])
            share = getattr(weights, tid)
            if share <= 0:
                continue
            frac = share / weights.cover
            tier_quotas.append((int(tier['center']), max(0, round(total_pick * frac))))

    diff = total_pick - sum(q for _, q in tier_quotas)
    fix_i = 0
    while diff != 0 and tier_quotas:
        c, q = tier_quotas[fix_i % len(tier_quotas)]
        if diff > 0:
            tier_quotas[fix_i % len(tier_quotas)] = (c, q + 1)
            diff -= 1
        elif q > 0:
            tier_quotas[fix_i % len(tier_quotas)] = (c, q - 1)
            diff += 1
        fix_i += 1
        if fix_i > len(tier_quotas) * 24:
            break

    ranked = sorted(
        range(n),
        key=lambda i: score_unit_for_style(
            units[i].text,
            style_id,
            writing_intent=writing_intent,
        ),
        reverse=True,
    )
    assignments: list[RewriteAssignment] = []
    ptr = 0
    for center, quota in tier_quotas:
        for _ in range(quota):
            if ptr >= len(ranked) or len(assignments) >= total_pick:
                break
            assignments.append(RewriteAssignment(unit_index=ranked[ptr], tier_center=center))
            ptr += 1
    return assignments[:total_pick]


def _min_similarity_for_intensity(pct: int) -> float | None:
    """低浓度要求改写结果与原句足够接近，否则视为「改太狠」并保留原句。"""
    if pct > 30:
        return None
    return max(0.62, 1.0 - pct / 45.0)


def _accept_replacement(
    unit: TextUnit,
    rewritten: str,
    *,
    intensity_pct: int = 100,
) -> str:
    """拒绝模型返回过长/过短或像整段粘贴的改写，未通过则保留原句。"""
    new = _normalize_replacement_text(unit, rewritten)
    if not new:
        return unit.text
    orig = unit.text.strip()
    if new.strip() == orig:
        return unit.text
    o_len = len(orig)
    n_len = len(new)
    if o_len >= 4:
        if n_len > o_len * 2.2 or n_len < o_len * 0.35:
            logger.info('reject rewrite: length ratio %s->%s', o_len, n_len)
            return unit.text
    orig_punct = len(re.findall(r'[。！？!?]', orig))
    new_punct = len(re.findall(r'[。！？!?]', new))
    if orig_punct <= 1 and new_punct >= max(2, orig_punct + 2):
        logger.info('reject rewrite: too many new sentences')
        return unit.text
    min_sim = _min_similarity_for_intensity(intensity_pct)
    if min_sim is not None and o_len >= 6:
        ratio = SequenceMatcher(None, orig, new).ratio()
        if ratio < min_sim:
            logger.info(
                'reject rewrite: similarity %.2f < %.2f at %s%%',
                ratio,
                min_sim,
                intensity_pct,
            )
            return unit.text
    return new


def _single_sentence_intensity_rules(pct: int) -> str:
    if pct > 30:
        return ''
    return (
        f'\n【低浓度（约{pct}%）】\n'
        '只改这一句；尽量保留原词与原句式；禁止整句换种说法；'
        '禁止新增第二人称、设问、叹号或明显口语语气词。'
    )


def _iter_rewrite_single_unit(
    llm: Any,
    unit: TextUnit,
    style_id: str,
    intensity_pct: int,
) -> Iterator[str]:
    style_key = normalize_style_id(style_id)
    style_desc = format_style_prompt(style_key, intensity_pct)
    micro = _single_sentence_intensity_rules(intensity_pct)
    chain = build_text_chain(llm, [
        (
            'system',
            '你是文体改写专家。只输出一条改写后的句子，不要编号、不要解释、不要输出其他句子。',
        ),
        (
            'user',
            f'''【目标风格】{style_desc}{micro}

【原句】
{unit.text}

【要求】
1. 只改写以上这一句话，保持事实不变
2. 只输出改写后的这一句（单行，禁止换行）
3. 禁止输出多句或整段；不要输出句末标点（标点由系统保留）

{get_article_format_prompt()}''',
        ),
    ])
    yield from iter_chain_text(chain)


def iter_rewrite_body_selective(
    llm: Any,
    body: str,
    style_id: str,
    *,
    intensity: int | None = None,
    writing_intent: str | None = None,
    stats_out: dict[str, Any] | None = None,
) -> Iterator[tuple[str, str]]:
    style_key = normalize_style_id(style_id)
    pct = resolve_style_intensity(style_key, intensity)
    leading, units = split_text_units(body)
    cover_ratio = compute_cover(pct)

    def _fill_stats(
        *,
        unit_count: int,
        planned: int,
        rewritten: int,
    ) -> None:
        if stats_out is None:
            return
        stats_out.update({
            'selective': True,
            'unit_count': unit_count,
            'planned_count': planned,
            'rewritten_count': rewritten,
            'target_pct': pct,
            'cover_ratio': round(cover_ratio, 4),
        })

    if not units and not leading:
        _fill_stats(unit_count=0, planned=0, rewritten=0)
        yield '', body
        return

    assignments = plan_rewrite_assignments_for_units(
        units,
        pct,
        style_key,
        writing_intent=writing_intent,
    )
    if not assignments:
        _fill_stats(unit_count=len(units), planned=0, rewritten=0)
        yield '', body
        return

    replacements: dict[int, str] = {}
    merged = join_text_units(units, replacements, leading=leading)
    yield '', merged

    for assignment in assignments:
        unit = units[assignment.unit_index]
        acc: list[str] = []
        try:
            for token in _iter_rewrite_single_unit(
                llm,
                unit,
                style_key,
                pct,
            ):
                acc.append(token)
                replacements[assignment.unit_index] = _accept_replacement(
                    unit,
                    ''.join(acc),
                    intensity_pct=pct,
                )
                merged = join_text_units(units, replacements, leading=leading)
                yield token, merged
        except Exception as e:
            logger.warning('selective unit %s failed: %s', assignment.unit_index, e)

    _fill_stats(
        unit_count=len(units),
        planned=len(assignments),
        rewritten=len({
            i for i in replacements
            if replacements[i].strip() != units[i].text.strip()
        }),
    )


def rewrite_body_selective(
    llm: Any,
    body: str,
    style_id: str,
    *,
    intensity: int | None = None,
    writing_intent: str | None = None,
    on_progress: Callable[[str], None] | None = None,
) -> str:
    last = body
    for _delta, full in iter_rewrite_body_selective(
        llm,
        body,
        style_id,
        intensity=intensity,
        writing_intent=writing_intent,
    ):
        last = full
        if on_progress:
            on_progress(full)
    return last
