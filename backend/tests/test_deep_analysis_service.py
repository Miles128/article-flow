from app.services.deep_analysis_service import (
    deep_analysis_section_titles,
    format_material_evidence,
    format_search_evidence,
    outline_nodes_from_sections,
    sections_to_markdown,
)


def test_section_titles_from_hot_topic_framework():
    titles = deep_analysis_section_titles()
    assert '深层分析' in titles
    assert len(titles) >= 4


def test_format_search_evidence_skips_empty():
    text = format_search_evidence([
        {'title': 'A', 'content': '摘要', 'source': 'bing', 'url': 'https://a'},
        {'title': '', 'content': ''},
    ])
    assert 'A' in text
    assert 'bing' in text


def test_sections_to_markdown():
    md = sections_to_markdown([
        {'title': '事件速览', 'content': '发生了什么'},
    ])
    assert '## 事件速览' in md
    assert '发生了什么' in md


def test_outline_nodes_from_sections():
    nodes = outline_nodes_from_sections(
        [{'title': '深层分析', 'content': '原因链条'}],
        article_title='测试',
    )
    assert len(nodes) == 1
    assert nodes[0]['title'] == '深层分析'
    assert nodes[0]['sectionType'] == 'info'


def test_format_material_evidence():
    text = format_material_evidence([
        {'title': '报道', 'content': '正文', 'source_url': 'https://x'},
    ])
    assert '报道' in text
