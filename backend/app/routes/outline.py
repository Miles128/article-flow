from flask import Blueprint, request, jsonify
from ..models import Outline
from ..services.llm_service import get_llm_service
import json

bp = Blueprint('outline', __name__)

@bp.route('', methods=['GET'])
def get_outline():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    
    outline = Outline.get_by_project(project_id)
    return jsonify(outline or {})

@bp.route('', methods=['POST'])
def create_or_update_outline():
    data = request.json
    if not data or 'project_id' not in data:
        return jsonify({'error': 'project_id is required'}), 400
    
    project_id = data['project_id']
    title = data.get('title', '文章大纲')
    nodes = data.get('nodes', [])
    
    from .. import db_data as _db
    from bson.objectid import ObjectId
    
    existing = db.outlines.find_one({'project_id': project_id})
    
    if existing:
        db.outlines.update_one(
            {'_id': existing['_id']},
            {'$set': {
                'title': title,
                'nodes': nodes,
                'version': existing.get('version', 1) + 1,
                'updated_at': __import__('datetime').datetime.utcnow()
            }}
        )
        outline = db.outlines.find_one({'_id': existing['_id']})
    else:
        outline = Outline.create(project_id, title, nodes)
    
    outline['_id'] = str(outline['_id'])
    return jsonify(outline)

@bp.route('/generate', methods=['POST'])
def generate_outline():
    data = request.json
    if not data or 'topic' not in data:
        return jsonify({'error': 'topic is required'}), 400
    
    topic = data['topic']
    target_word_count = data.get('target_word_count', 2000)
    style = data.get('style', 'general')
    
    try:
        llm = get_llm_service()
        
        style_desc = {
            'general': '通用正式风格',
            'wechat': '公众号轻松风格',
            'video': '视频脚本口语化风格',
            'academic': '学术论文风格'
        }.get(style, '通用正式风格')
        
        prompt = f"""请为以下主题生成一个结构清晰的文章大纲：

主题：{topic}
目标字数：约{target_word_count}字
风格要求：{style_desc}

请生成包含以下要素的大纲：
1. 吸引人的主标题
2. 3-5个二级章节
3. 每个章节包含2-4个三级要点
4. 简短的开头和结尾

请以JSON格式返回：
{{
    "title": "文章主标题",
    "nodes": [
        {{
            "id": 1,
            "title": "一级章节标题",
            "type": "section",
            "children": [
                {{
                    "id": 11,
                    "title": "二级要点",
                    "content": "要点简要说明"
                }}
            ]
        }}
    ],
    "intro": "开头简要",
    "conclusion": "结尾简要"
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的文章结构设计师，擅长构建逻辑清晰的文章大纲。'},
            {'role': 'user', 'content': prompt}
        ])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            outline_data = json.loads(json_match.group())
        else:
            outline_data = json.loads(result)
        
        return jsonify(outline_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/templates', methods=['GET'])
def get_templates():
    templates = [
        {
            'id': 'problem-solution',
            'name': '问题-解决方案',
            'description': '提出问题，分析原因，给出解决方案',
            'structure': [
                {'id': 1, 'title': '问题背景', 'type': 'section'},
                {'id': 2, 'title': '问题分析', 'type': 'section'},
                {'id': 3, 'title': '解决方案', 'type': 'section'},
                {'id': 4, 'title': '实施建议', 'type': 'section'},
                {'id': 5, 'title': '总结展望', 'type': 'section'}
            ]
        },
        {
            'id': 'storytelling',
            'name': '故事叙述',
            'description': '以故事线串联内容，情感共鸣',
            'structure': [
                {'id': 1, 'title': '引子', 'type': 'section'},
                {'id': 2, 'title': '冲突', 'type': 'section'},
                {'id': 3, 'title': '转折', 'type': 'section'},
                {'id': 4, 'title': '高潮', 'type': 'section'},
                {'id': 5, 'title': '结局', 'type': 'section'}
            ]
        },
        {
            'id': 'how-to',
            'name': '教程指南',
            'description': '步骤清晰，实用性强',
            'structure': [
                {'id': 1, 'title': '为什么要学', 'type': 'section'},
                {'id': 2, 'title': '必备条件', 'type': 'section'},
                {'id': 3, 'title': '步骤详解', 'type': 'section'},
                {'id': 4, 'title': '常见问题', 'type': 'section'},
                {'id': 5, 'title': '进阶技巧', 'type': 'section'}
            ]
        },
        {
            'id': 'listicle',
            'name': '清单体',
            'description': '要点清晰，易于阅读',
            'structure': [
                {'id': 1, 'title': '开篇引入', 'type': 'section'},
                {'id': 2, 'title': '要点一', 'type': 'section'},
                {'id': 3, 'title': '要点二', 'type': 'section'},
                {'id': 4, 'title': '要点三', 'type': 'section'},
                {'id': 5, 'title': '总结', 'type': 'section'}
            ]
        }
    ]
    
    return jsonify(templates)
