from app.services.anti_ai_service import scan_content, apply_rule_fixes


def test_scan_detects_cliche():
    text = '在当今时代，随着科技的发展，值得注意的是这个问题。综上所述，效果显著。'
    result = scan_content(text)
    assert result['match_count'] >= 3
    assert result['score'] > 0


def test_apply_rule_fixes_reduces_score():
    text = '然而值得注意的是，综上所述效果显著。'
    result = apply_rule_fixes(text)
    assert '然而' not in result['fixed_content'] or '但' in result['fixed_content']
    assert result['after_score'] <= result['before_score']
