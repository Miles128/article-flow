from app.services.anti_ai_service import (
    scan_content,
    apply_rule_fixes,
    _count_em_dashes,
    _long_sentence_stats,
    _count_parallel_tricolons,
    _fix_excess_em_dashes,
    _find_semantic_similar_pairs,
    _sentence_similarity,
)


def test_em_dash_limit_per_500():
    text = '开头' + '——中间' * 3 + '结尾' * 20
    assert _count_em_dashes(text) == 3
    result = scan_content(text)
    assert result['dimensions']['em_dash_excess'] >= 1


def test_long_sentence_ratio_limit():
    long = '这是一句超过三十个字的中文测试句子，用来验证长句比例检测是否正常工作。'
    text = (long + '。') * 5 + '短句。' * 5
    ratio, long_count, total, long_sents = _long_sentence_stats(text, 30)
    assert long_count == 5
    assert total == 10
    assert ratio == 0.5
    assert len(long_sents) == 5
    scan = scan_content(text)
    assert any(m['category'] == 'long_sentence' for m in scan['matches'])
    assert scan['dimensions']['long_sentence_ratio'] == 50.0


def test_semantic_similarity_detects_repetition():
    a = '这个功能能帮你提升写作效率，减少重复劳动。'
    b = '它可以提高你的写作效率，降低重复工作。'
    assert _sentence_similarity(a, b) >= 0.52
    text = f'{a}接下来讲别的。{b}最后一句。'
    pairs = _find_semantic_similar_pairs(text, threshold=0.52, window=6)
    assert len(pairs) >= 1
    scan = scan_content(text * 80)
    assert scan['dimensions']['semantic_similar_excess'] >= 1
    assert any(m['category'] == 'semantic_similarity' for m in scan['matches'])


def test_parallel_tricolon_limit():
    text = '它提升了效率、改善了质量、增强了体验。' * 3
    assert _count_parallel_tricolons(text) >= 3
    scan = scan_content(text)
    assert scan['dimensions']['parallel_tricolon_excess'] >= 1


def test_fix_excess_em_dashes():
    text = 'A——B——C——D'
    fixed = _fix_excess_em_dashes(text, max_per_500=1)
    assert _count_em_dashes(fixed) <= 1


def test_apply_rule_fixes_reduces_em_dashes():
    text = '然而——值得注意的是——综上所述——效果显著。'
    result = apply_rule_fixes(text)
    assert _count_em_dashes(result['fixed_content']) <= _count_em_dashes(text)
