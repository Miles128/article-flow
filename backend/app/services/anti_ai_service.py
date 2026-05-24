"""去 AI 味规则引擎 — 确定性扫描、人味化维度与修复"""
import re
from typing import TypedDict

from ..config_loader import get_anti_ai_rules
from ..content_loader import get_humanize_checklist, get_publish_gate


class RuleMatch(TypedDict):
    text: str
    category: str
    start: int
    end: int
    suggestion: str


class ScanResult(TypedDict):
    score: int
    target_score: int
    passed: bool
    match_count: int
    matches: list[RuleMatch]
    dimensions: dict[str, int | float]
    gate_status: str


def _all_cliches(rules: dict) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    cats = rules.get('cliche_categories', {})
    for cat, phrases in cats.items():
        for p in phrases:
            items.append((p, cat))
    for item in rules.get('banned_phrases', []):
        pat = item.get('pattern', '')
        if pat and not pat.startswith('('):
            items.append((pat, 'banned'))
    return items


def _sentence_lengths(text: str) -> list[int]:
    parts = re.split(r'[。！？!?…\n]+', text)
    return [len(p.strip()) for p in parts if p.strip()]


def _burstiness_score(text: str) -> float:
    lengths = _sentence_lengths(text)
    if len(lengths) < 3:
        return 50.0
    max_gap = 0
    for i in range(len(lengths) - 2):
        trio = lengths[i:i + 3]
        gap = max(trio) - min(trio)
        max_gap = max(max_gap, gap)
    short_count = sum(1 for ln in lengths if 5 <= ln <= 12)
    score = 80.0
    if max_gap >= 15:
        score -= 25
    if short_count >= 2:
        score -= 20
    return max(0.0, min(100.0, score))


def _count_phrases(text: str, phrases: list[str]) -> int:
    total = 0
    for p in phrases:
        total += text.count(p)
    return total


def _fact_density_score(text: str) -> float:
    char_count = max(len(text), 1)
    blocks = max(1, char_count // 500)
    numbers = len(re.findall(r'\d+[\d.%]*', text))
    proper = len(re.findall(r'[A-Z][a-zA-Z0-9]+|[\u4e00-\u9fff]{2,6}(?:GPT|AI|Pro|Max|Plus)?', text))
    hits = numbers + min(proper, blocks * 3)
    ratio = hits / blocks
    if ratio >= 1:
        return 10.0
    if ratio >= 0.5:
        return 40.0
    return 70.0


def _punctuation_score(text: str) -> float:
    score = 60.0
    if '——' in text or '--' in text:
        score -= 15
    if text.count('？') + text.count('?') >= 2:
        score -= 15
    if '(' in text or '（' in text:
        score -= 10
    if text.count('…') + text.count('...') > 3:
        score += 10
    return max(0.0, min(100.0, score))


def _structural_score(text: str) -> float:
    hits = 0
    if re.search(r'首先.{0,80}其次', text):
        hits += 2
    if re.search(r'第一[点项].{0,80}第二[点项]', text):
        hits += 1
    if text.count('不仅') and text.count('而且'):
        hits += 1
    return min(100.0, hits * 35.0)


def _first_person_score(text: str) -> float:
    count = text.count('我') + text.count('我们')
    if count >= 3:
        return 10.0
    if count == 2:
        return 40.0
    if count == 1:
        return 60.0
    return 85.0


def _weighted_score(dims: dict[str, float]) -> int:
    weights = {
        'burstiness': 0.30,
        'phrases': 0.30,
        'vocab': 0.20,
        'structural': 0.10,
        'punctuation': 0.10,
    }
    total = sum(dims.get(k, 50.0) * w for k, w in weights.items())
    return int(min(100, max(0, round(total))))


def _gate_status(score: int, gate: dict) -> str:
    block = int(gate.get('export_block_threshold', 45))
    warn = int(gate.get('warn_threshold', 35))
    if score < warn:
        return 'pass'
    if score < block:
        return 'warn'
    return 'fail'


def scan_content(content: str) -> ScanResult:
    rules = get_anti_ai_rules()
    humanize = get_humanize_checklist()
    gate = get_publish_gate()
    target = int(gate.get('target_score', rules.get('target_score', 30)))
    matches: list[RuleMatch] = []
    text = content or ''

    for item in rules.get('banned_phrases', []):
        pat = item.get('pattern', '')
        if not pat:
            continue
        for m in re.finditer(pat, text):
            matches.append({
                'text': m.group(),
                'category': 'banned',
                'start': m.start(),
                'end': m.end(),
                'suggestion': item.get('suggestion', '删除或改写'),
            })

    for phrase, cat in _all_cliches(rules):
        if cat == 'banned':
            continue
        start = 0
        while True:
            idx = text.find(phrase, start)
            if idx < 0:
                break
            matches.append({
                'text': phrase,
                'category': cat,
                'start': idx,
                'end': idx + len(phrase),
                'suggestion': f'删除或改写套话「{phrase}」',
            })
            start = idx + len(phrase)

    transition = humanize.get('transition_forbidden', [])
    vocab = humanize.get('ai_vocab_blacklist', [])
    trans_hits = _count_phrases(text, transition)
    vocab_hits = _count_phrases(text, vocab)

    for phrase in transition:
        if phrase in text:
            idx = text.find(phrase)
            matches.append({
                'text': phrase,
                'category': 'transition',
                'start': idx,
                'end': idx + len(phrase),
                'suggestion': '改用口语过渡（不过/其实/说到）',
            })

    for word in vocab:
        if word in text:
            idx = text.find(word)
            matches.append({
                'text': word,
                'category': 'ai_vocab',
                'start': idx,
                'end': idx + len(word),
                'suggestion': '换成具体描述',
            })

    seen: set[tuple[int, str]] = set()
    unique: list[RuleMatch] = []
    for m in sorted(matches, key=lambda x: x['start']):
        key = (m['start'], m['text'])
        if key in seen:
            continue
        seen.add(key)
        unique.append(m)

    burst = _burstiness_score(text)
    phrase_score = min(100.0, trans_hits * 25.0)
    vocab_score = min(100.0, max(0, vocab_hits - 1) * 20.0)
    struct = _structural_score(text)
    punct = _punctuation_score(text)
    fact = _fact_density_score(text)
    first_p = _first_person_score(text)

    dims: dict[str, int | float] = {
        'burstiness': round(burst, 1),
        'phrases': round(phrase_score, 1),
        'vocab': round(vocab_score, 1),
        'structural': round(struct, 1),
        'punctuation': round(punct, 1),
        'fact_density': round(fact, 1),
        'first_person': round(first_p, 1),
        'transition_hits': trans_hits,
        'vocab_hits': vocab_hits,
        'opening_hits': sum(1 for m in unique if m['category'] == 'opening'),
        'banned_hits': sum(1 for m in unique if m['category'] == 'banned'),
    }

    legacy_density = min(100, int(len(unique) / max(len(text), 1) * 5000))
    dims['cliche_density'] = legacy_density

    score = _weighted_score({
        'burstiness': burst,
        'phrases': phrase_score,
        'vocab': vocab_score,
        'structural': struct,
        'punctuation': punct,
    })
    score = min(100, score + int(fact * 0.05) + int(first_p * 0.05))

    block_threshold = int(gate.get('export_block_threshold', 45))
    passed = score < block_threshold

    return {
        'score': score,
        'target_score': target,
        'passed': passed,
        'match_count': len(unique),
        'matches': unique[:80],
        'dimensions': dims,
        'gate_status': _gate_status(score, gate),
    }


def apply_rule_fixes(content: str) -> dict[str, str | int | bool]:
    rules = get_anti_ai_rules()
    result = content
    replace_map: dict[str, str] = rules.get('replace_map', {})
    for old, new in replace_map.items():
        if old:
            result = result.replace(old, new)

    for item in rules.get('banned_phrases', []):
        pat = item.get('pattern', '')
        if pat and not pat.startswith('('):
            result = result.replace(pat, '')

    before = scan_content(content)
    after = scan_content(result)
    return {
        'original_content': content,
        'fixed_content': result.strip(),
        'before_score': before['score'],
        'after_score': after['score'],
        'improved': after['score'] < before['score'],
        'matches_removed': before['match_count'] - after['match_count'],
    }


def check_export_gate(content: str) -> dict[str, object]:
    scan = scan_content(content)
    gate = get_publish_gate()
    threshold = int(gate.get('export_block_threshold', 45))
    allowed = scan['score'] < threshold
    return {
        'allowed': allowed,
        'score': scan['score'],
        'threshold': threshold,
        'gate_status': scan['gate_status'],
        'dimensions': scan['dimensions'],
        'message': '通过发布门禁' if allowed else f'AI味评分 {scan["score"]} ≥ {threshold}，请先运行人味化改写',
    }
