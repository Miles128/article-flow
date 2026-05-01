from flask import Blueprint, request, jsonify
from ..services.hotnews_service import HotNewsService

bp = Blueprint('hotnews', __name__)

@bp.route('', methods=['GET'])
def get_hotnews():
    sources = request.args.getlist('source')
    if not sources:
        sources = ['weibo', 'zhihu', 'bilibili']
    
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
            'enabled': False
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
    if not data or 'keywords' not in data:
        return jsonify({'error': 'keywords are required'}), 400
    
    keywords = data['keywords']
    count = data.get('count', 5)
    
    from ..services.llm_service import get_llm_service
    
    try:
        llm = get_llm_service()
        
        prompt = f"""基于以下关键词或热点话题，挖掘{count}个有潜力的文章选题：

关键词：{', '.join(keywords)}

每个选题需要包含：
1. 标题（吸引眼球）
2. 角度（独特的切入点）
3. 预估热度（1-100分）
4. 目标受众描述

请以JSON格式返回：
{{
    "topics": [
        {{
            "title": "选题标题",
            "angle": "切入角度",
            "heat_score": 85,
            "audience": "目标受众",
            "tags": ["标签1", "标签2"]
        }}
    ]
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位资深的内容策划专家，擅长从热点中挖掘有潜力的选题。'},
            {'role': 'user', 'content': prompt}
        ])
        
        import re
        import json
        
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
