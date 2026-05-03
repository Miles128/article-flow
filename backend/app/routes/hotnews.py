from flask import Blueprint, request, jsonify
import json
import re

bp = Blueprint('hotnews', __name__)

@bp.route('', methods=['GET'])
def get_hotnews():
    return jsonify({
        'sources': {},
        'merged': [],
        'byCategory': {},
        'trendingKeywords': [],
        'timestamp': '',
        'message': '热搜列表功能已暂时移除，请使用智能选题功能'
    })

@bp.route('/mine-topics', methods=['POST'])
def mine_topics():
    data = request.json
    
    keywords = data.get('keywords', [])
    count = data.get('count', 8)
    
    llm_config = data.get('llmConfig', {})
    api_key = llm_config.get('apiKey')
    base_url = llm_config.get('baseUrl')
    model_name = llm_config.get('modelName')
    temperature = llm_config.get('temperature')
    
    if not api_key:
        return jsonify({'error': '请先配置 LLM API Key'}), 400
    
    keywords_str = ', '.join(keywords) if keywords else '综合热点'
    
    try:
        from ..services.llm_service import get_llm_service
        
        llm = get_llm_service(
            provider='custom',
            model_name=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=temperature
        )
        
        prompt = f"""你是一位资深的内容策划专家和新闻分析师。

用户指定的选题方向关键词：{keywords_str}

请基于当前热点趋势和新闻价值，挖掘 {count} 个有潜力的文章选题。

要求：
1. 每个选题要有独特的切入角度
2. 标题要吸引眼球，适合自媒体平台
3. 分析该选题的新闻价值和潜在热度
4. 给出建议的搜索关键词，方便用户查找相关资料

请严格以 JSON 格式返回，不要有任何额外文字：
{{
    "topics": [
        {{
            "title": "选题标题",
            "angle": "独特的切入角度和写作思路",
            "newsValue": "新闻价值分析（为什么这个选题值得写）",
            "potentialAudience": "目标受众描述",
            "searchKeywords": ["关键词1", "关键词2", "关键词3"],
            "tags": ["标签1", "标签2", "标签3"]
        }}
    ]
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位资深的内容策划专家和新闻分析师，擅长挖掘有新闻价值的选题。请严格按JSON格式输出，不要有任何额外文字。'},
            {'role': 'user', 'content': prompt}
        ])
        
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            parsed = json.loads(json_match.group())
            return jsonify({
                **parsed,
                'keywordsUsed': keywords,
                'count': count
            })
        
        return jsonify({'rawResult': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/generate-search-links', methods=['POST'])
def generate_search_links():
    data = request.json
    keywords = data.get('keywords', [])
    
    if not keywords:
        return jsonify({'error': '关键词不能为空'}), 400
    
    search_links = []
    for keyword in keywords:
        encoded_keyword = keyword.replace(' ', '+')
        search_links.append({
            'keyword': keyword,
            'platforms': [
                {
                    'name': '百度搜索',
                    'url': f'https://www.baidu.com/s?wd={encoded_keyword}'
                },
                {
                    'name': '谷歌搜索',
                    'url': f'https://www.google.com/search?q={encoded_keyword}'
                },
                {
                    'name': '知乎搜索',
                    'url': f'https://www.zhihu.com/search?q={encoded_keyword}'
                },
                {
                    'name': '微信搜索',
                    'url': f'https://weixin.sogou.com/weixin?query={encoded_keyword}'
                }
            ]
        })
    
    return jsonify({'searchLinks': search_links})
