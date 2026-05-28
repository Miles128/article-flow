from app.article_format import ensure_article_title, get_article_format_prompt


def test_format_prompt_requires_headings_and_bold():
    prompt = get_article_format_prompt()
    assert '# 文章主标题' in prompt
    assert '禁止 ##' in prompt or '禁止 ##、###' in prompt
    assert '**' in prompt


def test_ensure_article_title_prepends():
    body = '## 引言\n\n正文 **重点**。'
    result = ensure_article_title(body, '我的选题标题')
    assert result.startswith('# 我的选题标题')
    assert '**引言**' in result
    assert '## ' not in result


def test_ensure_article_title_skips_when_present():
    original = '# 已有标题\n\n## 节\n\n内容'
    assert ensure_article_title(original, '别的标题') == original
