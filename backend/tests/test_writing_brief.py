from app.services.writing_brief_service import format_brief_for_prompt


def test_format_brief_for_prompt():
    block = format_brief_for_prompt({
        'thesis': '核心论断一句',
        'insights': ['洞察甲', '洞察乙'],
        'section_questions': {'引言': '为何此时重要？'},
        'forbidden_cliches': ['在当今'],
    })
    assert '核心论断' in block
    assert '洞察甲' in block
    assert '须回答' in block
    assert '在当今' in block


def test_format_brief_empty():
    assert format_brief_for_prompt(None) == ''
