from app.utils_markdown import (
    merge_markdown_title,
    split_markdown_title,
    transform_preserving_title,
)


def test_split_markdown_title():
    content = '# 我的文章标题\n\n正文第一段。\n\n正文第二段。'
    title, body = split_markdown_title(content)
    assert title == '# 我的文章标题\n\n'
    assert body == '正文第一段。\n\n正文第二段。'


def test_split_without_title():
    content = '## 章节\n\n正文。'
    title, body = split_markdown_title(content)
    assert title == ''
    assert body == content


def test_transform_preserving_title():
    original = '# 固定标题\n\n这是正文。'
    result = transform_preserving_title(
        original,
        lambda body: body.replace('正文', '改写后的正文'),
    )
    assert result.startswith('# 固定标题')
    assert '改写后的正文' in result
    assert '固定标题' in result.split('\n', 1)[0]


def test_merge_roundtrip():
    content = '# 标题\n\n正文内容'
    title, body = split_markdown_title(content)
    assert merge_markdown_title(title, body) == content
