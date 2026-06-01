"""热搜服务 - 关键词搜索（Bing / DuckDuckGo / Tavily）"""

import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# =========================================================================
# 预定义类别及搜索关键词
# =========================================================================

CATEGORIES = {
    '科技': {
        'icon': '💻',
        'description': 'AI、互联网、芯片、数码、科技前沿',
        'queries': ['最新科技新闻', 'AI人工智能最新进展', '科技行业动态'],
    },
    '财经': {
        'icon': '📈',
        'description': '股市、基金、经济政策、投资理财',
        'queries': ['今日财经新闻', '股市行情分析', '经济政策解读'],
    },
    '娱乐': {
        'icon': '🎬',
        'description': '影视、综艺、明星、音乐',
        'queries': ['娱乐热点新闻', '影视综艺动态', '娱乐圈最新消息'],
    },
    '体育': {
        'icon': '⚽',
        'description': '足球、篮球、赛事、运动员',
        'queries': ['体育赛事新闻', '足球篮球比赛', '最新体育动态'],
    },
    '社会': {
        'icon': '📰',
        'description': '民生、事件、调查、法治',
        'queries': ['社会热点事件', '民生新闻', '社会时事'],
    },
    '教育': {
        'icon': '🎓',
        'description': '高考、考研、留学、教育政策',
        'queries': ['教育最新政策', '高考考研动态', '教育行业新闻'],
    },
    '健康': {
        'icon': '🏥',
        'description': '医疗、养生、疾病防控、健康新知',
        'queries': ['健康新闻', '医疗最新动态', '养生健康知识'],
    },
    '汽车': {
        'icon': '🚗',
        'description': '新能源、评测、行业、驾乘',
        'queries': ['汽车行业新闻', '新能源汽车动态', '汽车评测资讯'],
    },
    '房产': {
        'icon': '🏠',
        'description': '楼市、政策、装修、趋势',
        'queries': ['房产楼市新闻', '房地产政策', '房价走势分析'],
    },
    '游戏': {
        'icon': '🎮',
        'description': '电竞、新游、评测、行业',
        'queries': ['游戏行业新闻', '电竞最新赛事', '新游戏发布动态'],
    },
    '旅游': {
        'icon': '✈️',
        'description': '景点、攻略、机票酒店、出境',
        'queries': ['旅游资讯热点', '旅行攻略推荐', '机票酒店优惠'],
    },
    '美食': {
        'icon': '🍜',
        'description': '食谱、餐厅、食材、文化',
        'queries': ['美食新闻推荐', '网红餐厅探店', '美食文化资讯'],
    },
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9',
}

SEARCH_TIMEOUT = 20
_CJK_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')
_LATIN_RE = re.compile(r'[a-zA-Z]')


class HotNewsService:

    @staticmethod
    def normalize_search_query(query: str) -> str:
        """Use full phrase search — wrap in quotes so engines match the entire title."""
        q = (query or '').strip()
        if not q:
            return q
        if len(q) >= 2 and q[0] == q[-1] and q[0] in '"\'':
            return q
        return f'"{q}"'

    @staticmethod
    def _strip_quotes(query: str) -> str:
        q = (query or '').strip()
        if len(q) >= 2 and q[0] == q[-1] and q[0] in '"\'':
            return q[1:-1].strip()
        return q

    @staticmethod
    def _script_counts(text: str) -> tuple[int, int]:
        return len(_CJK_RE.findall(text)), len(_LATIN_RE.findall(text))

    @staticmethod
    def detect_query_language(query: str) -> str:
        """zh if query contains CJK, else en."""
        core = HotNewsService._strip_quotes(query)
        cjk, latin = HotNewsService._script_counts(core)
        if cjk > 0:
            return 'zh'
        if latin > 0:
            return 'en'
        return 'zh'

    @staticmethod
    def item_matches_language(item: Dict[str, Any], lang: str) -> bool:
        title = (item.get('title') or '').strip()
        content = (item.get('content') or '').strip()
        if not title:
            return False

        title_cjk, title_latin = HotNewsService._script_counts(title)
        body_cjk, body_latin = HotNewsService._script_counts(content)
        total_cjk = title_cjk + body_cjk
        total_latin = title_latin + body_latin

        if lang == 'zh':
            if title_cjk == 0:
                return False
            if total_latin == 0:
                return True
            return total_cjk >= total_latin

        if lang == 'en':
            if title_cjk > 0 or body_cjk > 0:
                return False
            return title_latin >= 3

        return True

    @staticmethod
    def filter_by_language(
        items: List[Dict[str, Any]],
        lang: str,
    ) -> List[Dict[str, Any]]:
        return [item for item in items if HotNewsService.item_matches_language(item, lang)]

    @staticmethod
    def _is_chinese_query(query: str) -> bool:
        return HotNewsService.detect_query_language(query) == 'zh'

    @staticmethod
    def _filter_chinese_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return HotNewsService.filter_by_language(items, 'zh')

    @staticmethod
    def _bing_search_url(query: str) -> str:
        encoded = quote(query)
        return (
            f'https://cn.bing.com/search?q={encoded}'
            '&setlang=zh-Hans&mkt=zh-CN&cc=CN&ensearch=0'
        )

    @staticmethod
    def _make_item(title: str, url: str, content: str, source: str) -> Dict[str, Any]:
        return {
            'title': title,
            'url': url,
            'content': content[:300],
            'hot_value': 0,
            'source': source,
            'category': HotNewsService._categorize(title),
        }

    # =========================================================================
    # 类别查询
    # =========================================================================

    @staticmethod
    def get_categories() -> List[Dict[str, Any]]:
        """返回所有可用的大类建议"""
        return [
            {
                'name': name,
                'icon': cfg['icon'],
                'description': cfg['description'],
            }
            for name, cfg in CATEGORIES.items()
        ]

    # =========================================================================
    # 搜索引擎：Bing / DuckDuckGo（直接抓取，稳定）
    # =========================================================================

    @staticmethod
    def _parse_bing_html(html: str, max_results: int) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, 'html.parser')
        items: List[Dict[str, Any]] = []
        for el in soup.select('li.b_algo')[:max_results]:
            link = el.select_one('h2 a')
            if not link:
                continue
            title = link.get_text(strip=True)
            href = link.get('href', '')
            if not title or not href:
                continue
            desc = el.select_one('.b_caption p')
            content = desc.get_text(strip=True) if desc else ''
            items.append(HotNewsService._make_item(title, href, content, 'bing'))
        return items

    @staticmethod
    def _fetch_bing_url(url: str, max_results: int) -> List[Dict[str, Any]]:
        resp = requests.get(url, headers=HEADERS, timeout=SEARCH_TIMEOUT)
        resp.raise_for_status()
        return HotNewsService._parse_bing_html(resp.text, max_results)

    @staticmethod
    def search_bing(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        try:
            return HotNewsService._fetch_bing_url(
                HotNewsService._bing_search_url(query),
                max_results,
            )
        except Exception as e:
            logger.warning('Bing search error: %s', e)
            return []

    @staticmethod
    def search_duckduckgo(
        query: str,
        max_results: int = 10,
        lang: str = 'zh',
    ) -> List[Dict[str, Any]]:
        try:
            kl = 'cn-zh' if lang == 'zh' else 'us-en'
            url = f'https://lite.duckduckgo.com/lite/?q={quote(query)}&kl={kl}'
            resp = requests.get(url, headers=HEADERS, timeout=SEARCH_TIMEOUT)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')
            items: List[Dict[str, Any]] = []
            for link in soup.select('a.result-link')[:max_results]:
                href = link.get('href', '')
                if not href.startswith('http'):
                    continue
                title = link.get_text(strip=True)
                if not title:
                    continue
                items.append(HotNewsService._make_item(title, href, '', 'duckduckgo'))
            return items
        except Exception as e:
            logger.warning('DuckDuckGo search error: %s', e)
            return []

    # =========================================================================
    # 搜索引擎：ddgs 库（备用）
    # =========================================================================

    @staticmethod
    def _get_ddgs_class():
        try:
            from ddgs import DDGS
            return DDGS
        except ImportError:
            from duckduckgo_search import DDGS
            return DDGS

    @staticmethod
    def _ddgs_search(
        query: str,
        max_results: int,
        backend: str,
        source: str,
        region: str = 'cn-zh',
    ) -> List[Dict[str, Any]]:
        try:
            DDGS = HotNewsService._get_ddgs_class()
            with DDGS() as ddgs:
                results = list(
                    ddgs.text(
                        query,
                        max_results=max_results,
                        backend=backend,
                        region=region,
                    )
                )
                items: List[Dict[str, Any]] = []
                for r in results:
                    title = r.get('title', '')
                    items.append(HotNewsService._make_item(
                        title,
                        r.get('href', r.get('url', '')),
                        (r.get('body', r.get('content', '')) or ''),
                        source,
                    ))
                return items
        except Exception as e:
            logger.warning('%s search error: %s', source, e)
            return []

    @staticmethod
    def search_google(
        query: str,
        max_results: int = 10,
        lang: str = 'zh',
    ) -> List[Dict[str, Any]]:
        region = 'cn-zh' if lang == 'zh' else 'us-en'
        return HotNewsService._ddgs_search(
            query, max_results, 'google', 'google', region=region,
        )

    @staticmethod
    def _search_engine_tasks(
        query: str,
        per_engine: int,
        lang: str,
    ) -> Dict[str, Any]:
        region = 'cn-zh' if lang == 'zh' else 'us-en'
        if lang == 'zh':
            return {
                'bing_cn': lambda: HotNewsService._fetch_bing_url(
                    HotNewsService._bing_search_url(query),
                    per_engine,
                ),
                'duckduckgo': lambda: HotNewsService.search_duckduckgo(
                    query, per_engine, lang='zh',
                ),
                'ddg': lambda: HotNewsService._ddgs_search(
                    query, per_engine, 'duckduckgo', 'duckduckgo', region=region,
                ),
                'google': lambda: HotNewsService._ddgs_search(
                    query, per_engine, 'google', 'google', region=region,
                ),
            }
        encoded = quote(query)
        return {
            'bing': lambda: HotNewsService._fetch_bing_url(
                f'https://www.bing.com/search?q={encoded}&setlang=en-US&mkt=en-US',
                per_engine,
            ),
            'duckduckgo': lambda: HotNewsService.search_duckduckgo(
                query, per_engine, lang='en',
            ),
            'ddg': lambda: HotNewsService._ddgs_search(
                query, per_engine, 'duckduckgo', 'duckduckgo', region=region,
            ),
            'google': lambda: HotNewsService._ddgs_search(
                query, per_engine, 'google', 'google', region=region,
            ),
        }

    # =========================================================================
    # 搜索引擎：Tavily（可选）
    # =========================================================================

    @staticmethod
    def search_tavily(
        query: str,
        tavily_api_key: str,
        max_results: int = 10,
        lang: str = 'zh',
    ) -> List[Dict[str, Any]]:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_api_key)
            kwargs: Dict[str, Any] = {
                'max_results': max_results,
                'search_depth': 'basic',
            }
            if lang == 'zh':
                kwargs['country'] = 'china'
            result = client.search(query, **kwargs)
            items = []
            for r in result.get('results', []):
                items.append({
                    'title': r.get('title', ''),
                    'url': r.get('url', ''),
                    'content': r.get('content', ''),
                    'hot_value': 0,
                    'source': 'tavily',
                    'category': HotNewsService._categorize(r.get('title', '')),
                })
            return items
        except Exception as e:
            logger.warning(f'Tavily search error: {e}')
            return []

    # =========================================================================
    # 合并去重
    # =========================================================================

    @staticmethod
    def _merge_items(*item_lists: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
        seen_titles: set[str] = set()
        merged: List[Dict[str, Any]] = []
        for items in item_lists:
            for item in items:
                normalized = item.get('title', '').strip().lower()
                if not normalized or normalized in seen_titles:
                    continue
                seen_titles.add(normalized)
                merged.append(item)
                if len(merged) >= limit:
                    return merged
        return merged

    # =========================================================================
    # 组合搜索：百度 + Bing + DuckDuckGo，Tavily 兜底
    # =========================================================================

    @staticmethod
    def search_combined(
        query: str,
        tavily_api_key: str = None,
        max_results: int = 10,
    ) -> tuple[List[Dict[str, Any]], List[str]]:
        """多引擎并行；搜索语言与结果语言必须一致"""
        per_engine = max(max_results, 5)
        warnings: List[str] = []
        lang = HotNewsService.detect_query_language(query)
        lang_label = '中文' if lang == 'zh' else '英文'
        engine_tasks = HotNewsService._search_engine_tasks(query, per_engine, lang)

        result_lists: List[List[Dict[str, Any]]] = []
        min_needed = min(3, max_results)

        with ThreadPoolExecutor(max_workers=len(engine_tasks)) as pool:
            futures = {pool.submit(fn): name for name, fn in engine_tasks.items()}
            try:
                for fut in as_completed(futures, timeout=SEARCH_TIMEOUT + 5):
                    name = futures[fut]
                    try:
                        items = fut.result()
                        if items:
                            items = HotNewsService.filter_by_language(items, lang)
                            if items:
                                result_lists.append(items)
                    except Exception as e:
                        logger.warning('%s search error: %s', name, e)
                    merged = HotNewsService._merge_items(*result_lists, limit=max_results * 2)
                    merged = HotNewsService.filter_by_language(merged, lang)
                    if len(merged) >= min_needed:
                        break
            except TimeoutError:
                logger.warning('Search timed out for query: %s', query)

        merged = HotNewsService._merge_items(*result_lists, limit=max_results * 2)
        before = len(merged)
        merged = HotNewsService.filter_by_language(merged, lang)
        if before > len(merged):
            warnings.append(f'已过滤与{lang_label}搜索不一致的结果')

        if not merged and tavily_api_key:
            tavily_items = HotNewsService.search_tavily(
                query, tavily_api_key, max_results, lang=lang,
            )
            merged = HotNewsService.filter_by_language(tavily_items, lang)

        if not merged:
            warnings.append('搜索引擎暂时不可用，请检查网络连接或稍后重试')

        return merged, warnings

    # =========================================================================
    # 关键词搜索（真搜索入口）
    # =========================================================================

    @staticmethod
    def search_by_query(
        query: str,
        tavily_api_key: str = None,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        raw = (query or '').strip()
        if not raw:
            return {
                'query': '',
                'items': [],
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': '搜索关键词不能为空',
            }
        q = HotNewsService.normalize_search_query(raw)
        lang = HotNewsService.detect_query_language(raw)
        items, warnings = HotNewsService.search_combined(q, tavily_api_key, max_results)
        result: Dict[str, Any] = {
            'query': raw,
            'engine_query': q,
            'search_language': lang,
            'items': items,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        if warnings:
            result['warnings'] = warnings
        return result

    # =========================================================================
    # 基于类别搜索
    # =========================================================================

    @staticmethod
    def search_by_category(
        category: str,
        tavily_api_key: str = None,
        max_results: int = 10,
        extra_query: str = '',
    ) -> Dict[str, Any]:
        """根据用户选择的大类，搜索相关新闻；可附加关键词"""
        extra = (extra_query or '').strip()
        cat_cfg = CATEGORIES.get(category)
        if not cat_cfg:
            if extra:
                result = HotNewsService.search_by_query(extra, tavily_api_key, max_results)
                result['category'] = category
                return result
            return {
                'category': category,
                'items': [],
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': f'未知的类别: {category}，请直接输入关键词搜索',
            }

        queries: List[str] = []
        if extra:
            queries.append(extra)
            queries.append(f'{category} {extra}')
        queries.extend(cat_cfg['queries'])

        all_items: List[Dict[str, Any]] = []
        seen_titles: set[str] = set()
        for q in queries:
            items, _ = HotNewsService.search_combined(q, tavily_api_key, max_results)
            for item in items:
                normalized = item.get('title', '').strip().lower()
                if normalized not in seen_titles:
                    seen_titles.add(normalized)
                    item['category'] = category
                    all_items.append(item)

        return {
            'category': category,
            'query': extra or None,
            'items': all_items,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

    # =========================================================================
    # 分类工具
    # =========================================================================

    @staticmethod
    def _categorize(title: str) -> str:
        """根据标题关键词推断类别"""
        categories = {
            '科技': ['科技', 'AI', '人工智能', 'ChatGPT', '大模型', '芯片', '5G', '互联网', '程序员', '代码', '算法', '编程', 'DeepSeek', '机器人', '数码'],
            '娱乐': ['娱乐', '明星', '电影', '电视剧', '综艺', '音乐', '演唱会', '粉丝', '娱乐圈', '导演', '演员'],
            '财经': ['财经', '股票', '基金', '投资', '理财', '银行', '经济', '股市', '牛市', '熊市', 'A股', '港股'],
            '体育': ['体育', '足球', '篮球', 'NBA', '世界杯', '奥运会', '运动员', '比赛', 'CBA', '中超'],
            '社会': ['社会', '新闻', '事件', '事故', '调查', '警方', '法院', '民生'],
            '教育': ['教育', '学校', '学生', '高考', '考研', '留学', '教师', '大学', '招生'],
            '健康': ['健康', '医疗', '医院', '医生', '药品', '疫苗', '疾病', '新冠', '养生'],
            '游戏': ['游戏', '电竞', '王者荣耀', '原神', '英雄联盟', 'LOL', 'Steam'],
            '美食': ['美食', '餐厅', '做菜', '食谱', '火锅', '烧烤', '奶茶', '探店'],
            '旅游': ['旅游', '旅行', '景点', '酒店', '机票', '度假', '出游'],
            '汽车': ['汽车', '新能源', '特斯拉', '比亚迪', '电动车', 'SUV', '驾驶'],
            '房产': ['房产', '楼市', '房价', '房地产', '买房', '租房', '装修'],
        }
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in title:
                    return category
        return '其他'

    # Keep backward compatibility alias
    _categorize_topic = _categorize

    # =========================================================================
    # 通用搜索入口（给 mine-topics 等使用）
    # =========================================================================

    @staticmethod
    def search_with_fallback(query: str, tavily_api_key: str = None, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索入口：优先 Bing+DDG+Google，失败尝试 Tavily"""
        q = HotNewsService.normalize_search_query(query)
        items, _ = HotNewsService.search_combined(q, tavily_api_key, max_results)
        return items

    # =========================================================================
    # 趋势关键词提取（给 mine-topics 使用）
    # =========================================================================

    @staticmethod
    def extract_trending_keywords(items: List[Dict], top_n: int = 20) -> List[Dict[str, Any]]:
        import re
        keyword_freq = {}
        for item in items:
            title = item.get('title', '')
            words = re.findall(r'[\u4e00-\u9fa5]{2,}', title)
            for word in words:
                if len(word) >= 2:
                    keyword_freq[word] = keyword_freq.get(word, 0) + 1

        sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
        return [{'keyword': kw, 'count': count} for kw, count in sorted_keywords[:top_n]]
