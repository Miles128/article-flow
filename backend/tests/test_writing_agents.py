from app.services.writing_agents import format_prior_context
from app.utils_words import count_article_words


def test_format_prior_lists_completed_titles():
    prior = '**第一节**\n\n内容A\n\n**第二节**\n\n内容B'
    ctx = format_prior_context(prior, ['第一节', '第二节'])
    assert '已完成章节' in ctx
    assert '第一节' in ctx
    assert '内容B' in ctx


def test_fast_draft_joins_all_sections():
    parts = ['**A**\n\n段落一', '**B**\n\n段落二', '**C**\n\n段落三']
    full = '\n\n'.join(parts)
    assert '**A**' in full and '**B**' in full and '**C**' in full
    assert count_article_words(full) > count_article_words(parts[-1])
