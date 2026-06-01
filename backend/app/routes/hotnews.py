"""热点新闻路由 - 类别选择 + 搜索引擎"""

import os
import logging
from flask import Blueprint, request, jsonify
from ..utils import parse_json_from_llm, translate_error, extract_llm_config, get_query_arg
from ..services.hotnews_service import HotNewsService
from ..services.llm_service import get_llm_service

logger = logging.getLogger(__name__)

bp = Blueprint('hotnews', __name__)


def _get_tavily_key():
    return os.getenv('TAVILY_API_KEY')


@bp.route('/categories', methods=['GET'])
def get_categories():
    """返回可用的大类建议列表"""
    categories = HotNewsService.get_categories()
    return jsonify({'categories': categories})


@bp.route('/search', methods=['GET'])
def search_hotnews():
    """关键词搜索（百度 + Bing + DuckDuckGo）"""
    query = (request.args.get('query') or request.args.get('q') or '').strip()
    max_raw = get_query_arg(request.args, 'max_results', 'maxResults', default='10')
    max_results = min(int(max_raw or 10), 30)

    if not query:
        return jsonify({'error': '请输入搜索关键词'}), 400

    try:
        result = HotNewsService.search_by_query(
            query,
            tavily_api_key=_get_tavily_key(),
            max_results=max_results,
        )
        return jsonify(result)
    except Exception as e:
        logger.error('Search failed: %s', e, exc_info=True)
        return jsonify({
            'query': query,
            'items': [],
            'timestamp': '',
            'error': translate_error(e),
        })


@bp.route('/mine-topics', methods=['POST'])
def mine_topics():
    """基于搜索结果 + LLM 挖掘选题"""
    data = request.json

    count = min(data.get('count', 8), 20)

    query = (data.get('query') or '').strip()
    keywords = data.get('keywords', [])
    if not query:
        if isinstance(keywords, list):
            query = ' '.join(str(k).strip() for k in keywords if str(k).strip())
        elif keywords:
            query = str(keywords).strip()

    if not query:
        return jsonify({'error': '请提供 query 搜索词（完整标题）'}), 400

    llm_cfg = extract_llm_config(data)
    api_key = llm_cfg['api_key']
    base_url = llm_cfg['base_url']
    model_name = llm_cfg['model_name']
    temperature = llm_cfg['temperature']

    tavily_api_key = _get_tavily_key()

    # 根据类别或关键词搜索新闻
    search_items = []
    try:
        result = HotNewsService.search_by_query(query, tavily_api_key, max_results=15)
        search_items = result.get('items', [])
    except Exception:
        search_items = []

    # 构建搜索上下文
    search_context = ''
    if search_items:
        lines = []
        for item in search_items[:30]:
            title = item.get('title', '')
            source = item.get('source', '')
            content = item.get('content', '')
            if title:
                entry = f'- [{source}] {title}'
                if content:
                    entry += f'\n  摘要: {content[:100]}'
                lines.append(entry)
        search_context = '\n'.join(lines)
    else:
        search_context = '暂无实时搜索数据'

    if not api_key:
        if search_items:
            return jsonify({
                'topics': [
                    {
                        'title': item.get('title', ''),
                        'angle': f'来自{item.get("source", "")}的搜索结果，可深度分析或跟进报道',
                        'newsValue': item.get('content', '')[:100] if item.get('content') else '',
                        'potentialAudience': '关注该领域的读者',
                        'searchKeywords': [item.get('title', '')],
                        'tags': [item.get('category', '其他')],
                    }
                    for item in search_items[:count]
                ],
                'queryUsed': query,
                'count': count,
                'fallback': True,
            })
        return jsonify({'error': '请先在 .env 中配置 LLM_API_KEY，或提供 query 以获取搜索结果'}), 400

    keywords_str = query

    try:
        llm = get_llm_service(
            provider='custom',
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature,
        )

        prompt = f"""你是一位资深的内容策划专家和新闻分析师。

以下是当前来自搜索引擎的最新新闻数据：
{search_context}

用户搜索关键词：{keywords_str}

请基于以上真实搜索结果，挖掘 {count} 个有潜力的文章选题。

要求：
1. 每个选题要基于真实搜索结果中的话题，不要编造
2. 每个选题要有独特的切入角度
3. 标题要吸引眼球，适合自媒体平台
4. 分析该选题的新闻价值和潜在热度
5. searchKeywords 必须是完整短语（整句标题或完整搜索句），禁止拆成单个词

请严格以 JSON 格式返回：
{{
    "topics": [
        {{
            "title": "选题标题",
            "angle": "独特的切入角度",
            "newsValue": "新闻价值分析",
            "potentialAudience": "目标受众描述",
            "searchKeywords": ["完整标题或完整搜索短语"],
            "tags": ["标签1", "标签2"]
        }}
    ]
}}"""

        result = llm.chat([
            {'role': 'system', 'content': '你是一位资深的内容策划专家和新闻分析师，擅长基于真实搜索结果挖掘有新闻价值的选题。请严格按JSON格式输出。'},
            {'role': 'user', 'content': prompt},
        ])

        parsed = parse_json_from_llm(result)
        if parsed:
            return jsonify({
                **parsed,
                'queryUsed': query,
                'count': count,
            })

        return jsonify({
            'rawResult': result,
            'queryUsed': query,
            'count': count,
        })
    except Exception as e:
        logger.error(f'Topic mining failed: {e}', exc_info=True)
        if search_items:
            return jsonify({
                'topics': [
                    {
                        'title': item.get('title', ''),
                        'angle': f'来自{item.get("source", "")}的搜索结果',
                        'newsValue': item.get('content', '')[:100] if item.get('content') else '',
                        'potentialAudience': '关注该领域的读者',
                        'searchKeywords': [item.get('title', '')],
                        'tags': [item.get('category', '其他')],
                    }
                    for item in search_items[:count]
                ],
                'queryUsed': query,
                'count': count,
                'fallback': True,
                'fallbackReason': translate_error(e),
            })
        return jsonify({'error': translate_error(e)}), 500


@bp.route('/generate-search-links', methods=['POST'])
def generate_search_links():
    """生成搜索链接"""
    from urllib.parse import quote as url_quote
    data = request.json
    keywords = data.get('keywords', [])

    if not keywords:
        return jsonify({'error': '关键词不能为空'}), 400

    search_links = []
    for keyword in keywords:
        phrase = HotNewsService.normalize_search_query(str(keyword))
        encoded_keyword = url_quote(phrase)
        search_links.append({
            'keyword': keyword,
            'platforms': [
                {'name': 'Bing 搜索', 'url': f'https://www.bing.com/search?q={encoded_keyword}'},
                {'name': '百度搜索', 'url': f'https://www.baidu.com/s?wd={encoded_keyword}'},
                {'name': '谷歌搜索', 'url': f'https://www.google.com/search?q={encoded_keyword}'},
                {'name': '知乎搜索', 'url': f'https://www.zhihu.com/search?q={encoded_keyword}'},
                {'name': '微信搜索', 'url': f'https://weixin.sogou.com/weixin?query={encoded_keyword}'},
            ],
        })

    return jsonify({'searchLinks': search_links})
