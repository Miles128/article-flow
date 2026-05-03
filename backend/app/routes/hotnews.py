from flask import Blueprint, request, jsonify
from ..services.hotnews_service import HotNewsService
import json
import re

bp = Blueprint('hotnews', __name__)

PLATFORM_ALIASES = {
    'all': ['weibo', 'zhihu', 'bilibili', 'toutiao'],
    'domestic': ['weibo', 'zhihu', 'bilibili', 'toutiao'],
    '全网': ['weibo', 'zhihu', 'bilibili', 'toutiao'],
}

@bp.route('', methods=['GET'])
def get_hotnews():
    sources = request.args.getlist('source')
    if not sources:
        sources = ['weibo', 'zhihu', 'bilibili']
    
    expanded_sources = []
    for s in sources:
        if s in PLATFORM_ALIASES:
            expanded_sources.extend(PLATFORM_ALIASES[s])
        else:
            expanded_sources.append(s)
    sources = list(set(expanded_sources))
    
    try:
        result = HotNewsService.get_all_hot(sources)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/weibo', methods=['GET'])
def get_weibo_hot():
    try:
        hotlist = HotNewsService.get_weibo_hot()
        return jsonify({'source': 'weibo', 'data': hotlist})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/zhihu', methods=['GET'])
def get_zhihu_hot():
    try:
        hotlist = HotNewsService.get_zhihu_hot()
        return jsonify({'source': 'zhihu', 'data': hotlist})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/bilibili', methods=['GET'])
def get_bilibili_hot():
    try:
        hotlist = HotNewsService.get_bilibili_hot()
        return jsonify({'source': 'bilibili', 'data': hotlist})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/toutiao', methods=['GET'])
def get_toutiao_hot():
    try:
        hotlist = HotNewsService.get_toutiao_hot()
        return jsonify({'source': 'toutiao', 'data': hotlist})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/trend', methods=['POST'])
def analyze_trend():
    data = request.json
    if not data or 'keyword' not in data:
        return jsonify({'error': 'keyword is required'}), 400
    
    try:
        result = HotNewsService.analyze_trend(data['keyword'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/sources', methods=['GET'])
def get_sources():
    sources = [
        {
            'id': 'all',
            'name': '全网热搜',
            'icon': 'globe',
            'description': '聚合所有平台热点',
            'enabled': True,
            'isGroup': True
        },
        {
            'id': 'weibo',
            'name': '微博热搜',
            'icon': 'message-circle',
            'description': '实时热门话题和社会热点',
            'enabled': True
        },
        {
            'id': 'zhihu',
            'name': '知乎热榜',
            'icon': 'book-open',
            'description': '深度讨论和专业问答',
            'enabled': True
        },
        {
            'id': 'bilibili',
            'name': 'B站热门',
            'icon': 'video',
            'description': '年轻用户关注的内容',
            'enabled': True
        },
        {
            'id': 'toutiao',
            'name': '今日头条',
            'icon': 'newspaper',
            'description': '综合资讯热点',
            'enabled': True
        }
    ]
    
    return jsonify(sources)

@bp.route('/categories', methods=['GET'])
def get_categories():
    categories = [
        {'id': 'tech', 'name': '科技', 'icon': 'cpu', 'keywords': ['科技', 'AI', '互联网', '编程']},
        {'id': 'entertainment', 'name': '娱乐', 'icon': 'clapperboard', 'keywords': ['明星', '电影', '音乐', '综艺']},
        {'id': 'finance', 'name': '财经', 'icon': 'trending-up', 'keywords': ['股票', '基金', '投资', '经济']},
        {'id': 'sports', 'name': '体育', 'icon': 'activity', 'keywords': ['足球', '篮球', 'NBA', '奥运会']},
        {'id': 'social', 'name': '社会', 'icon': 'users', 'keywords': ['社会', '新闻', '事件']},
        {'id': 'education', 'name': '教育', 'icon': 'graduation-cap', 'keywords': ['学校', '学生', '高考', '考研']},
        {'id': 'health', 'name': '健康', 'icon': 'heart', 'keywords': ['健康', '医疗', '医院', '药品']},
        {'id': 'game', 'name': '游戏', 'icon': 'gamepad-2', 'keywords': ['游戏', '电竞', '王者荣耀', '原神']},
        {'id': 'food', 'name': '美食', 'icon': 'utensils', 'keywords': ['美食', '餐厅', '做菜']},
        {'id': 'travel', 'name': '旅游', 'icon': 'map', 'keywords': ['旅游', '旅行', '景点', '酒店']},
        {'id': 'auto', 'name': '汽车', 'icon': 'car', 'keywords': ['汽车', '新能源', '特斯拉', '比亚迪']},
        {'id': 'other', 'name': '其他', 'icon': 'more-horizontal', 'keywords': []}
    ]
    
    return jsonify(categories)

@bp.route('/mine-topics', methods=['POST'])
def mine_topics():
    data = request.json
    
    keywords = data.get('keywords', [])
    count = data.get('count', 8)
    sources = data.get('sources', ['weibo', 'zhihu', 'bilibili'])
    
    llm_config = data.get('llmConfig', {})
    api_key = llm_config.get('apiKey')
    base_url = llm_config.get('baseUrl')
    model_name = llm_config.get('modelName')
    temperature = llm_config.get('temperature')
    
    expanded_sources = []
    for s in sources:
        if s in PLATFORM_ALIASES:
            expanded_sources.extend(PLATFORM_ALIASES[s])
        else:
            expanded_sources.append(s)
    sources = list(set(expanded_sources))
    
    try:
        hotnews_data = HotNewsService.get_all_hot(sources)
        merged_items = hotnews_data.get('merged', [])[:30]
        
        trending_keywords = hotnews_data.get('trendingKeywords', [])[:10]
        trending_text = '\n'.join([f"- {kw['keyword']} (出现 {kw['count']} 次)" for kw in trending_keywords])
        
        hot_items_text = ''
        for i, item in enumerate(merged_items[:20]):
            source_name = {
                'weibo': '微博',
                'zhihu': '知乎',
                'bilibili': 'B站',
                'toutiao': '头条'
            }.get(item.get('source', ''), item.get('source', ''))
            hot_items_text += f"{i+1}. [{source_name}] {item.get('title', '')}"
            if item.get('hotValue'):
                hot_items_text += f" (热度: {item['hotValue']})"
            hot_items_text += '\n'
        
        keyword_context = ''
        if keywords:
            keyword_context = f"\n用户指定的选题方向关键词：{', '.join(keywords)}"
        
        from ..services.llm_service import get_llm_service
        
        llm = get_llm_service(
            provider='custom',
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature
        )
        
        prompt = f"""你是一位资深的内容策划专家，擅长从热点数据中挖掘有潜力的文章选题。

以下是当前各平台的热点数据：

【热门关键词趋势】
{trending_text}

【热点话题列表】
{hot_items_text}{keyword_context}

请基于以上热点数据，挖掘 {count} 个有潜力的文章选题。

要求：
1. 选题要有独特的切入角度，避免同质化
2. 结合当前热点趋势，但要有自己的观点
3. 预估热度分数要基于实际数据的热度值
4. 目标受众描述要具体
5. 每个选题要有至少 3 个相关标签

请严格以 JSON 格式返回，不要有任何额外文字：
{{
    "topics": [
        {{
            "title": "选题标题（吸引眼球，包含关键词）",
            "angle": "独特的切入角度和写作思路",
            "heatScore": 85,
            "audience": "目标受众描述",
            "tags": ["标签1", "标签2", "标签3"],
            "reasoning": "为什么这个选题有潜力"
        }}
    ]
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位资深的内容策划专家，擅长从热点中挖掘有潜力的选题。请严格按JSON格式输出，不要有任何额外文字。'},
            {'role': 'user', 'content': prompt}
        ])
        
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            parsed = json.loads(json_match.group())
            return jsonify({
                **parsed,
                'hotnewsSummary': {
                    'totalItems': len(merged_items),
                    'sources': sources,
                    'trendingKeywords': trending_keywords[:5]
                }
            })
        
        return jsonify({'rawResult': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
