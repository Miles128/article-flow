"""Tests for outline writing helpers."""
from app.utils_outline import (
    MAX_OUTLINE_H2_SECTIONS,
    count_top_level_outline_nodes,
    extract_single_section_block,
    internalize_h2_headings,
    outline_nodes_to_markdown,
    outline_sections_for_writing,
    strip_overlap_with_prior,
    verify_draft_covers_outline,
    writing_context_limits,
)


def test_outline_nodes_to_markdown_includes_briefs():
    nodes = [
        {
            'title': '第一章',
            'content': '开篇要点',
            'children': [{'title': '1.1 小节', 'content': '细节说明'}],
        }
    ]
    md = outline_nodes_to_markdown(nodes)
    assert '第一章' in md
    assert '开篇要点' in md
    assert '1.1 小节' in md
    assert '细节说明' in md


def test_outline_sections_for_writing_top_level_only():
    nodes = [
        {
            'title': '引言',
            'content': '开篇',
            'claim': '问题已被低估',
            'open_question': '为何现在才爆发？',
            'children': [{'title': '要点A', 'content': '细节A'}],
        },
        {'title': '正文', 'content': '主体'},
    ]
    sections = outline_sections_for_writing(nodes)
    assert len(sections) == 2
    assert '要点A' in sections[0]['content']
    assert '本章主张' in sections[0]['content']
    assert '须回答' in sections[0]['content']
    assert sections[0]['title'] == '引言'


def test_internalize_h2_headings():
    raw = '## 引言\n\n段落\n\n## 正文\n\n更多'
    out = internalize_h2_headings(raw)
    assert '## ' not in out


def test_flatten_h2_without_space_after_hashes():
    raw = '##引言\n\n段落'
    out = internalize_h2_headings(raw)
    assert '##' not in out
    assert '**引言**' in out


def test_flatten_section_headings_strips_h3():
    raw = '# 主标题\n\n**章节一**\n\n### 小标题\n\n段落'
    out = internalize_h2_headings(raw)
    assert '### ' not in out
    assert '**小标题**' in out
    assert '# 主标题' in out


def test_verify_draft_covers_outline_internalized():
    sections = outline_sections_for_writing([
        {'title': '引言', 'content': 'a'},
        {'title': '正文', 'content': 'b'},
    ])
    draft = '**引言**\n\n内容\n\n**正文**\n\n更多'
    assert verify_draft_covers_outline(draft, sections) == []
    missing = verify_draft_covers_outline('**引言**\n\n只有引言', sections)
    assert missing == ['正文']


def test_writing_context_limits_for_2000_words():
    lim = writing_context_limits(2000)
    assert lim['prior_tail_chars'] <= 600
    assert lim['outline_index_max'] <= 350
    assert lim['section_brief_max'] <= 550
    assert lim['full_outline_max'] <= 1000


def test_max_h2_sections_constant():
    assert MAX_OUTLINE_H2_SECTIONS == 12
    assert count_top_level_outline_nodes([{'title': f'x{i}'} for i in range(12)]) == 12


def test_strip_overlap_with_prior():
    dup = '这是与前文尾部完全重复的一段开头文字，用于测试去重，须足够长才触发裁剪。'
    prior = f'**引言**\n\n{dup}'
    block = f'{dup}这是本节新内容。'
    out = strip_overlap_with_prior(block, prior)
    assert out == '这是本节新内容。'


def test_extract_single_section_block():
    block = '**第一节**\n\nA\n\n**第二节**\n\nB'
    out = extract_single_section_block(block, '第一节', ['第一节', '第二节'])
    assert '**第二节**' not in out
    assert 'A' in out
