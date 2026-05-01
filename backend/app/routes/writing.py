from flask import Blueprint, request, jsonify
from ..services.llm_service import get_llm_service
import json

bp = Blueprint('writing', __name__)

@bp.route('/continue', methods=['POST'])
def continue_writing():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    try:
        llm = get_llm_service()
        context = data.get('context', {})
        
        continuation = llm.continue_writing(data['content'], context)
        
        return jsonify({'continuation': continuation})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/polish', methods=['POST'])
def polish_content():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    style = data.get('style', 'professional')
    
    try:
        llm = get_llm_service()
        polished = llm.polish_content(data['content'], style)
        
        return jsonify({'polished_content': polished})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/rewrite', methods=['POST'])
def rewrite_content():
    data = request.json
    if not data or 'content' not in data or 'style' not in data:
        return jsonify({'error': 'content and style are required'}), 400
    
    style = data['style']
    
    style_prompts = {
        'formal': '正式专业风格，适合商务和专业文章',
        'casual': '轻松随意风格，适合博客和社交媒体',
        'conversational': '对话式风格，像和朋友聊天一样',
        'academic': '学术严谨风格，适合论文和研究报告',
        'poetic': '诗意优美风格，富有文学性',
        'humorous': '幽默风趣风格，轻松活泼'
    }
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请将以下内容重写为{style_prompts.get(style, style)}：

原文：
{data['content']}

请直接输出重写后的内容，保持原意不变，只改变表达风格。"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的写作风格转换专家。'},
            {'role': 'user', 'content': prompt}
        ])
        
        return jsonify({'rewritten_content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/expand', methods=['POST'])
def expand_content():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    target_length = data.get('target_length', 500)
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请扩展以下内容，目标字数约{target_length}字：

原文：
{data['content']}

要求：
1. 保持原意不变
2. 增加细节、例子或解释
3. 保持逻辑连贯
4. 不要重复内容

请直接输出扩展后的内容。"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的内容扩展专家，善于丰富文章内容。'},
            {'role': 'user', 'content': prompt}
        ])
        
        return jsonify({'expanded_content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/shorten', methods=['POST'])
def shorten_content():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    target_ratio = data.get('target_ratio', 0.5)
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请将以下内容压缩，保留核心信息，删除冗余部分：

原文：
{data['content']}

要求：
1. 保留所有关键信息
2. 删除重复和冗余的表达
3. 保持逻辑连贯
4. 压缩到原文约{int(target_ratio * 100)}%的长度

请直接输出压缩后的内容。"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的内容压缩专家，善于提炼核心信息。'},
            {'role': 'user', 'content': prompt}
        ])
        
        return jsonify({'shortened_content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/grammar-check', methods=['POST'])
def grammar_check():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    try:
        llm = get_llm_service()
        result = llm.check_grammar(data['content'])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/ai-taste', methods=['POST'])
def analyze_ai_taste():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    try:
        llm = get_llm_service()
        result = llm.analyze_ai_taste(data['content'])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/generate-title', methods=['POST'])
def generate_title():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    count = data.get('count', 5)
    platform = data.get('platform', 'general')
    
    platform_desc = {
        'wechat': '微信公众号风格，吸引点击',
        'zhihu': '知乎风格，专业深度',
        'xiaohongshu': '小红书风格，活泼有趣',
        'general': '通用风格，简洁有力'
    }.get(platform, '通用风格')
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请为以下文章生成{count}个标题，风格：{platform_desc}

文章内容：
{data['content'][:1000]}

请以JSON格式返回：
{{
    "titles": [
        {{"title": "标题1", "description": "简要说明"}},
        {{"title": "标题2", "description": "简要说明"}}
    ]
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位标题专家，擅长创作吸引人的文章标题。'},
            {'role': 'user', 'content': prompt}
        ])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
