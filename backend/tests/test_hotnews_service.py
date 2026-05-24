from app.services.hotnews_service import HotNewsService


def test_merge_items_deduplicates_by_title():
    a = [{'title': 'Hello World', 'url': '1', 'source': 'baidu'}]
    b = [{'title': 'hello world', 'url': '2', 'source': 'bing'}]
    c = [{'title': 'Another', 'url': '3', 'source': 'duckduckgo'}]
    merged = HotNewsService._merge_items(a, b, c, limit=10)
    assert len(merged) == 2
    assert merged[0]['source'] == 'baidu'


def test_normalize_search_query_wraps_phrase():
    assert HotNewsService.normalize_search_query('AI 检查暴雷') == '"AI 检查暴雷"'
    assert HotNewsService.normalize_search_query('"already quoted"') == '"already quoted"'
    assert HotNewsService.normalize_search_query('') == ''


def test_search_engine_tasks_zh_includes_ddg_and_google():
    tasks = HotNewsService._search_engine_tasks('"AI 检测"', 5, 'zh')
    assert 'bing_cn' in tasks
    assert 'duckduckgo' in tasks
    assert 'google' in tasks


def test_search_engine_tasks_en_includes_ddg_and_google():
    tasks = HotNewsService._search_engine_tasks('OpenAI release', 5, 'en')
    assert 'bing' in tasks
    assert 'google' in tasks


def test_detect_query_language():
    assert HotNewsService.detect_query_language('AI 检查暴雷') == 'zh'
    assert HotNewsService.detect_query_language('OpenAI release') == 'en'


def test_item_matches_language_zh():
    assert HotNewsService.item_matches_language(
        {'title': '高校 AI 检测误判引发争议', 'content': '多家媒体跟进报道'},
        'zh',
    )
    assert not HotNewsService.item_matches_language(
        {'title': 'How AI detectors fail in schools', 'content': 'English article'},
        'zh',
    )
    assert not HotNewsService.item_matches_language(
        {'title': 'Wikipedia', 'content': '中文摘要但英文标题'},
        'zh',
    )


def test_item_matches_language_en():
    assert HotNewsService.item_matches_language(
        {'title': 'OpenAI releases new model', 'content': 'Details inside'},
        'en',
    )
    assert not HotNewsService.item_matches_language(
        {'title': '高校 AI 检测', 'content': ''},
        'en',
    )


def test_filter_chinese_items():
    items = [
        {'title': '中文标题报道', 'content': '摘要内容', 'url': '1', 'source': 'bing'},
        {'title': 'English only result', 'content': 'snippet', 'url': '2', 'source': 'bing'},
    ]
    filtered = HotNewsService.filter_by_language(items, 'zh')
    assert len(filtered) == 1
    assert filtered[0]['title'] == '中文标题报道'


def test_bing_search_url_uses_chinese_market():
    url = HotNewsService._bing_search_url('test')
    assert 'cn.bing.com' in url
    assert 'mkt=zh-CN' in url
    assert 'ensearch=0' in url


def test_search_by_query_requires_keyword():
    result = HotNewsService.search_by_query('   ')
    assert result['items'] == []
    assert 'error' in result


def test_search_by_category_unknown_falls_back_to_query(monkeypatch):
    def fake_combined(query, tavily_api_key=None, max_results=10):
        item = [{'title': f'Result for {query}', 'url': 'x', 'source': 'bing', 'content': '', 'hot_value': 0, 'category': '其他'}]
        return item, []

    monkeypatch.setattr(HotNewsService, 'search_combined', staticmethod(fake_combined))
    result = HotNewsService.search_by_category('自定义话题', extra_query='OpenAI 发布')
    assert result['items']
    assert result['items'][0]['title'] == 'Result for "OpenAI 发布"'
