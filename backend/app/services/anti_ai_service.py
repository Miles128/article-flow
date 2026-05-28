"""去 AI 味规则引擎 — 确定性扫描、人味化维度与修复"""
import math
import re
from typing import TypedDict

from ..config_loader import get_anti_ai_rules
from ..content_loader import get_humanize_checklist, get_publish_gate
from ..utils_markdown import transform_preserving_title
from ..article_format import get_article_format_prompt


def get_style_limits() -> dict[str, float | int]:
    rules = get_anti_ai_rules()
    raw = rules.get('style_limits', {})
    return {
        'em_dash_max_per_500': int(raw.get('em_dash_max_per_500', 1)),
        'long_sentence_chars': int(raw.get('long_sentence_chars', 30)),
        'long_sentence_max_ratio': float(raw.get('long_sentence_max_ratio', 0.10)),
        'parallel_tricolon_max_per_1000': int(raw.get('parallel_tricolon_max_per_1000', 1)),
        'semantic_similarity_threshold': float(raw.get('semantic_similarity_threshold', 0.52)),
        'semantic_similar_max_per_1000': int(raw.get('semantic_similar_max_per_1000', 1)),
        'semantic_compare_window': int(raw.get('semantic_compare_window', 6)),
    }


def get_anti_ai_style_prompt() -> str:
    limits = get_style_limits()
    return (
        '严格遵守去AI味规则：避免「在当今/随着/值得注意的是/综上所述」等套话；'
        '用具体数字和场景替代空洞形容词；段落长短有变化。'
        f'破折号（——/—）不超过每500字{limits["em_dash_max_per_500"]}个；'
        f'超过{limits["long_sentence_chars"]}字的句子占比不超过'
        f'{int(float(limits["long_sentence_max_ratio"]) * 100)}%，长句必须拆短；'
        f'三个并列词/短语的排比，每1000字最多{limits["parallel_tricolon_max_per_1000"]}处；'
        f'语义相近、换说法重复的句子，每1000字最多{limits["semantic_similar_max_per_1000"]}组，'
        '删掉冗余复述，一句只说一个意思。\n'
        f'{get_article_format_prompt()}'
    )


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


_PARTICLE_CHARS = frozenset('的是了在与和及就也都还又而但如把被让给从以可以它这个帮你')


def _split_sentences(text: str, min_chars: int = 2) -> list[str]:
    parts = re.split(r'[。！？!?…\n]+', text)
    return [p.strip() for p in parts if len(p.strip()) >= min_chars]


def _char_bigrams(text: str) -> set[str]:
    compact = re.sub(r'\s+', '', text)
    if len(compact) < 2:
        return {compact} if compact else set()
    return {compact[i:i + 2] for i in range(len(compact) - 1)}


def _content_chars(text: str) -> set[str]:
    compact = re.sub(r'[\s，。！？、；：「」『』（）]+', '', text)
    return {c for c in compact if c not in _PARTICLE_CHARS}


def _common_phrase_boost(a: str, b: str, min_len: int = 3) -> float:
    aa = re.sub(r'\s+', '', a)
    bb = re.sub(r'\s+', '', b)
    if not aa or not bb:
        return 0.0
    for length in range(min(len(aa), len(bb)), min_len - 1, -1):
        for i in range(len(aa) - length + 1):
            frag = aa[i:i + length]
            if frag in bb:
                return min(0.45, length / max(len(aa), len(bb)))
    return 0.0


def _sentence_similarity(a: str, b: str) -> float:
    aa = re.sub(r'\s+', '', a)
    bb = re.sub(r'\s+', '', b)
    if not aa or not bb:
        return 0.0
    if aa == bb:
        return 1.0
    grams_a = _char_bigrams(aa)
    grams_b = _char_bigrams(bb)
    union = grams_a | grams_b
    bigram_jaccard = len(grams_a & grams_b) / len(union) if union else 0.0
    content_a = _content_chars(aa)
    content_b = _content_chars(bb)
    content_union = content_a | content_b
    content_jaccard = (
        len(content_a & content_b) / len(content_union) if content_union else 0.0
    )
    overlap = content_a & content_b
    min_content = min(len(content_a), len(content_b))
    overlap_ratio = len(overlap) / min_content if min_content >= 4 else 0.0
    phrase_boost = _common_phrase_boost(aa, bb)
    blended = (
        bigram_jaccard * 0.25
        + content_jaccard * 0.35
        + overlap_ratio * 0.35
        + phrase_boost
    )
    return min(1.0, blended)


class SimilarPair(TypedDict):
    index_a: int
    index_b: int
    similarity: float
    sentence_a: str
    sentence_b: str


def _find_semantic_similar_pairs(
    text: str,
    threshold: float = 0.52,
    window: int = 6,
) -> list[SimilarPair]:
    sentences = _split_sentences(text, min_chars=6)
    pairs: list[SimilarPair] = []
    seen: set[tuple[int, int]] = set()
    for i, sent_a in enumerate(sentences):
        for j in range(i + 1, min(i + window + 1, len(sentences))):
            sim = _sentence_similarity(sent_a, sentences[j])
            if sim < threshold:
                continue
            key = (i, j)
            if key in seen:
                continue
            seen.add(key)
            pairs.append({
                'index_a': i,
                'index_b': j,
                'similarity': round(sim, 2),
                'sentence_a': sent_a[:60],
                'sentence_b': sentences[j][:60],
            })
    return pairs


def _semantic_similarity_stats(
    text: str,
    threshold: float = 0.52,
    window: int = 6,
    max_per_1000: int = 1,
) -> tuple[list[SimilarPair], int, int]:
    pairs = _find_semantic_similar_pairs(text, threshold, window)
    count = len(pairs)
    allowed = _quota_for_length(len(text), 1000) * max(1, max_per_1000)
    excess = max(0, count - allowed)
    return pairs, allowed, excess


def _semantic_similarity_score(excess: int) -> float:
    if excess <= 0:
        return 10.0
    return min(100.0, 10.0 + excess * 35.0)


def _sentence_lengths(text: str) -> list[int]:
    return [len(s) for s in _split_sentences(text)]


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


def _quota_for_length(char_count: int, per_unit: int) -> int:
    if char_count <= 0:
        return 0
    return max(1, math.ceil(char_count / per_unit))


def _count_em_dashes(text: str) -> int:
    count = text.count('——')
    rest = text.replace('——', '')
    count += rest.count('—')
    count += len(re.findall(r'(?<![-])--(?![-])', text))
    return count


def _em_dash_stats(text: str, max_per_500: int = 1) -> tuple[int, int, int]:
    count = _count_em_dashes(text)
    allowed = _quota_for_length(len(text), 500) * max(1, max_per_500)
    excess = max(0, count - allowed)
    return count, allowed, excess


def _long_sentence_stats(text: str, threshold: int = 30) -> tuple[float, int, int, list[str]]:
    sentences = _split_sentences(text)
    if not sentences:
        return 0.0, 0, 0, []
    long_sents = [s for s in sentences if len(s) > threshold]
    long_count = len(long_sents)
    return long_count / len(sentences), long_count, len(sentences), long_sents


def _count_parallel_tricolons(text: str) -> int:
    patterns = [
        r'(?:[^，。！？；\n、]{2,14}[、，]){2}[^，。！？；\n、]{2,14}',
        r'(?:[^，。！？；\n]{2,12}的[^，。！？；\n]{2,12}[、，]){2}[^，。！？；\n]{2,12}的[^，。！？；\n]{2,12}',
    ]
    seen: set[tuple[int, int]] = set()
    total = 0
    for pat in patterns:
        for m in re.finditer(pat, text):
            span = (m.start(), m.end())
            if span in seen:
                continue
            seen.add(span)
            total += 1
    return total


def _parallel_tricolon_stats(text: str, max_per_1000: int = 1) -> tuple[int, int, int]:
    count = _count_parallel_tricolons(text)
    allowed = _quota_for_length(len(text), 1000) * max(1, max_per_1000)
    excess = max(0, count - allowed)
    return count, allowed, excess


def _fix_excess_em_dashes(text: str, max_per_500: int = 1) -> str:
    allowed = _quota_for_length(len(text), 500) * max(1, max_per_500)
    result = text
    for dash in ('——', '—'):
        while _count_em_dashes(result) > allowed and dash in result:
            result = result.replace(dash, '，', 1)
    while _count_em_dashes(result) > allowed and re.search(r'(?<![-])--(?![-])', result):
        result = re.sub(r'(?<![-])--(?![-])', '，', result, count=1)
    return result


def _punctuation_score(text: str, em_dash_excess: int = 0) -> float:
    score = 60.0
    if em_dash_excess > 0:
        score += min(40.0, em_dash_excess * 20.0)
    elif _count_em_dashes(text) > 0:
        score -= 5
    if text.count('？') + text.count('?') >= 2:
        score -= 10
    if '(' in text or '（' in text:
        score -= 10
    if text.count('…') + text.count('...') > 3:
        score += 10
    return max(0.0, min(100.0, score))


def _long_sentence_score(ratio: float, max_ratio: float = 0.10) -> float:
    if ratio <= max_ratio:
        return 10.0
    over = ratio - max_ratio
    return min(100.0, 10.0 + over * 400.0)


def _parallel_tricolon_score(excess: int) -> float:
    if excess <= 0:
        return 10.0
    return min(100.0, 10.0 + excess * 35.0)


def _structural_score(text: str, tricolon_excess: int = 0) -> float:
    hits = 0
    if re.search(r'首先.{0,80}其次', text):
        hits += 2
    if re.search(r'第一[点项].{0,80}第二[点项]', text):
        hits += 1
    if text.count('不仅') and text.count('而且'):
        hits += 1
    base = min(100.0, hits * 35.0)
    if tricolon_excess > 0:
        base = max(base, _parallel_tricolon_score(tricolon_excess))
    return base


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
        'burstiness': 0.18,
        'phrases': 0.18,
        'vocab': 0.14,
        'structural': 0.10,
        'punctuation': 0.08,
        'long_sentence': 0.14,
        'parallel_tricolon': 0.08,
        'semantic_similarity': 0.10,
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
    limits = get_style_limits()
    humanize = get_humanize_checklist()
    gate = get_publish_gate()
    target = int(gate.get('target_score', rules.get('target_score', 30)))
    matches: list[RuleMatch] = []
    text = content or ''

    em_count, em_allowed, em_excess = _em_dash_stats(
        text, int(limits['em_dash_max_per_500']),
    )
    long_ratio, long_count, sent_total, long_sentences = _long_sentence_stats(
        text, int(limits['long_sentence_chars']),
    )
    tri_count, tri_allowed, tri_excess = _parallel_tricolon_stats(
        text, int(limits['parallel_tricolon_max_per_1000']),
    )
    sim_pairs, sim_allowed, sim_excess = _semantic_similarity_stats(
        text,
        float(limits['semantic_similarity_threshold']),
        int(limits['semantic_compare_window']),
        int(limits['semantic_similar_max_per_1000']),
    )
    max_long_ratio = float(limits['long_sentence_max_ratio'])

    if em_excess > 0:
        matches.append({
            'text': f'破折号 {em_count} 处',
            'category': 'punctuation',
            'start': 0,
            'end': 0,
            'suggestion': f'每500字最多{limits["em_dash_max_per_500"]}个，当前超出 {em_excess} 处，改为逗号或拆句',
        })
    if long_ratio > max_long_ratio:
        pct = int(long_ratio * 100)
        max_pct = int(max_long_ratio * 100)
        matches.append({
            'text': f'长句占比 {pct}%',
            'category': 'long_sentence',
            'start': 0,
            'end': 0,
            'suggestion': f'超过{limits["long_sentence_chars"]}字的句子占 {long_count}/{sent_total}，应≤{max_pct}%，请拆短句',
        })
    for sent in long_sentences[:8]:
        if len(sent) <= int(limits['long_sentence_chars']):
            continue
        preview = sent[:48] + ('…' if len(sent) > 48 else '')
        matches.append({
            'text': preview,
            'category': 'long_sentence',
            'start': 0,
            'end': 0,
            'suggestion': f'此句 {len(sent)} 字，建议拆成两句以上',
        })
    if sim_excess > 0:
        matches.append({
            'text': f'语义相近句 {len(sim_pairs)} 组',
            'category': 'semantic_similarity',
            'start': 0,
            'end': 0,
            'suggestion': (
                f'每1000字最多{limits["semantic_similar_max_per_1000"]}组，'
                f'当前超出 {sim_excess} 组，请删掉换说法重复的句子'
            ),
        })
    for pair in sim_pairs[:6]:
        matches.append({
            'text': f'「{pair["sentence_a"]}…」↔「{pair["sentence_b"]}…」',
            'category': 'semantic_similarity',
            'start': 0,
            'end': 0,
            'suggestion': f'语义相似度 {pair["similarity"]}，保留一句即可',
        })
    if tri_excess > 0:
        matches.append({
            'text': f'三连排比 {tri_count} 处',
            'category': 'parallel_tricolon',
            'start': 0,
            'end': 0,
            'suggestion': f'每1000字最多{limits["parallel_tricolon_max_per_1000"]}处，当前超出 {tri_excess} 处，请打散并列结构',
        })

    for m in re.finditer(r'——|—|(?<![-])--(?![-])', text):
        if em_excess <= 0:
            break
        matches.append({
            'text': m.group(),
            'category': 'em_dash',
            'start': m.start(),
            'end': m.end(),
            'suggestion': '改为逗号、句号，或拆成两句',
        })

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
    struct = _structural_score(text, tri_excess)
    punct = _punctuation_score(text, em_excess)
    long_sent = _long_sentence_score(long_ratio, max_long_ratio)
    tricolon = _parallel_tricolon_score(tri_excess)
    semantic = _semantic_similarity_score(sim_excess)
    fact = _fact_density_score(text)
    first_p = _first_person_score(text)

    dims: dict[str, int | float] = {
        'burstiness': round(burst, 1),
        'phrases': round(phrase_score, 1),
        'vocab': round(vocab_score, 1),
        'structural': round(struct, 1),
        'punctuation': round(punct, 1),
        'long_sentence': round(long_sent, 1),
        'parallel_tricolon': round(tricolon, 1),
        'semantic_similarity': round(semantic, 1),
        'fact_density': round(fact, 1),
        'first_person': round(first_p, 1),
        'transition_hits': trans_hits,
        'vocab_hits': vocab_hits,
        'em_dash_count': em_count,
        'em_dash_allowed': em_allowed,
        'em_dash_excess': em_excess,
        'long_sentence_ratio': round(long_ratio * 100, 1),
        'long_sentence_count': long_count,
        'sentence_count': sent_total,
        'parallel_tricolon_count': tri_count,
        'parallel_tricolon_allowed': tri_allowed,
        'parallel_tricolon_excess': tri_excess,
        'semantic_similar_pair_count': len(sim_pairs),
        'semantic_similar_allowed': sim_allowed,
        'semantic_similar_excess': sim_excess,
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
        'long_sentence': long_sent,
        'parallel_tricolon': tricolon,
        'semantic_similarity': semantic,
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
    limits = get_style_limits()

    def fix_body(body: str) -> str:
        result = body
        replace_map: dict[str, str] = rules.get('replace_map', {})
        for old, new in replace_map.items():
            if old:
                result = result.replace(old, new)

        for item in rules.get('banned_phrases', []):
            pat = item.get('pattern', '')
            if pat and not pat.startswith('('):
                result = result.replace(pat, '')

        return _fix_excess_em_dashes(result, int(limits['em_dash_max_per_500'])).strip()

    fixed = transform_preserving_title(content, fix_body)
    before = scan_content(content)
    after = scan_content(fixed)
    return {
        'original_content': content,
        'fixed_content': fixed,
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
