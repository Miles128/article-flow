"""Tests for outline writing helpers."""
from app.utils_outline import outline_nodes_to_markdown, verify_draft_covers_outline, flatten_outline_nodes


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


def test_verify_draft_covers_outline():
    sections = flatten_outline_nodes([
        {'title': '引言', 'content': 'a'},
        {'title': '正文', 'content': 'b'},
    ])
    draft = '## 引言\n\n内容\n\n## 正文\n\n更多'
    assert verify_draft_covers_outline(draft, sections) == []
    missing = verify_draft_covers_outline('## 引言\n\n只有引言', sections)
    assert missing == ['正文']
