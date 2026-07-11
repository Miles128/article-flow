"""按大纲比例为各节分配目标字数（默认全文约 2000 字）"""
from __future__ import annotations

from typing import Any

DEFAULT_ARTICLE_WORDS = 2000
MIN_SECTION_WORDS = 200
ABSOLUTE_SECTION_FLOOR = 50


def section_word_floor(total_words: int, section_count: int) -> int:
    """节数多时降低单节下限，避免把全文目标抬到 n×200。"""
    n = max(section_count, 1)
    return min(MIN_SECTION_WORDS, max(ABSOLUTE_SECTION_FLOOR, int(total_words) // n))


def _section_weight(section: dict[str, Any]) -> float:
    brief = (section.get('content') or '').strip()
    title = (section.get('title') or '').strip()
    base = 1.0
    base += len(brief) / 80.0
    base += len(title) / 40.0
    return max(base, 0.5)


def allocate_section_word_budgets(
    sections: list[dict[str, Any]],
    total_words: int = DEFAULT_ARTICLE_WORDS,
) -> list[int]:
    """按大纲要点权重分配字数，总和严格等于 total_words。"""
    n = len(sections)
    if n == 0:
        return []
    total_words = max(200, int(total_words))
    floor = section_word_floor(total_words, n)

    weights = [_section_weight(s) for s in sections]
    weight_sum = sum(weights) or float(n)

    raw = [
        max(floor, int(round(total_words * w / weight_sum)))
        for w in weights
    ]
    delta = total_words - sum(raw)
    idx = 0
    while delta != 0 and n > 0:
        i = idx % n
        if delta > 0:
            raw[i] += 1
            delta -= 1
        elif raw[i] > floor:
            raw[i] -= 1
            delta += 1
        idx += 1
        if idx > n * total_words * 2:
            break
    return raw
