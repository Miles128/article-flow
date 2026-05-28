from app.services.writing_word_budget import (
    MIN_SECTION_WORDS,
    allocate_section_word_budgets,
    section_word_floor,
)


def test_allocate_sums_to_total():
    sections = [
        {'title': '引言', 'content': '短'},
        {'title': '正文', 'content': '这是一段较长的大纲要点说明，需要更多篇幅展开'},
        {'title': '结论', 'content': ''},
    ]
    budgets = allocate_section_word_budgets(sections, 2000)
    assert len(budgets) == 3
    assert sum(budgets) == 2000
    assert budgets[1] > budgets[0]


def test_allocate_equal_when_no_briefs():
    sections = [{'title': f'节{i}', 'content': ''} for i in range(4)]
    budgets = allocate_section_word_budgets(sections, 2000)
    assert sum(budgets) == 2000
    assert max(budgets) - min(budgets) <= 2


def test_allocate_does_not_inflate_total_for_many_sections():
    sections = [{'title': f'节{i}', 'content': ''} for i in range(12)]
    budgets = allocate_section_word_budgets(sections, 2000)
    assert sum(budgets) == 2000
    assert section_word_floor(2000, 12) < MIN_SECTION_WORDS


def test_section_word_floor():
    assert section_word_floor(2000, 4) == MIN_SECTION_WORDS
    assert section_word_floor(2000, 12) == 166
