from app.services.content_eval_service import eval_article_rules
from app.services.anti_ai_service import check_export_gate


def test_eval_article_rules_returns_dimensions():
    text = '标题测试\n\n' + '这是一段测试正文。' * 50 + '\n\n你觉得呢？'
    result = eval_article_rules(text, title='3个技巧提升写作效率')
    assert 'total_score' in result
    assert 'dimensions' in result
    assert 'title' in result['dimensions']
    assert isinstance(result['suggestions'], list)


def test_check_export_gate_blocks_high_ai_score():
    cliche = '在当今时代，随着科技的发展，值得注意的是这个问题。综上所述，效果显著。' * 5
    gate = check_export_gate(cliche)
    assert gate['allowed'] is False
    assert gate['score'] >= gate['threshold']


def test_check_export_gate_allows_clean_text():
    text = '上周二我踩了个坑。花了3小时调 prompt，结果输出还是像说明书。讲真，不如自己改两句。'
    gate = check_export_gate(text)
    assert gate['allowed'] is True
