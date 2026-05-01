from flask import Blueprint, request, jsonify
from ..services.llm_service import get_llm_service
import json

bp = Blueprint('review', __name__)

@bp.route('/comments', methods=['GET'])
def get_comments():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    
    from .. import db
    comments = list(db.comments.find({'project_id': project_id}).sort('created_at', -1))
    for c in comments:
        c['_id'] = str(c['_id'])
    
    return jsonify(comments)

@bp.route('/comments', methods=['POST'])
def create_comment():
    data = request.json
    if not data or 'project_id' not in data or 'content' not in data:
        return jsonify({'error': 'project_id and content are required'}), 400
    
    from .. import db
    from datetime import datetime
    
    comment = {
        'project_id': data['project_id'],
        'step': data.get('step'),
        'position': data.get('position'),
        'selection': data.get('selection'),
        'content': data['content'],
        'author': data.get('author', '匿名'),
        'resolved': False,
        'replies': [],
        'created_at': datetime.utcnow()
    }
    
    result = db.comments.insert_one(comment)
    comment['_id'] = str(result.inserted_id)
    
    return jsonify(comment), 201

@bp.route('/comments/<comment_id>', methods=['PUT'])
def update_comment(comment_id):
    data = request.json
    
    from .. import db
    from bson.objectid import ObjectId
    from datetime import datetime
    
    update_data = {}
    if 'content' in data:
        update_data['content'] = data['content']
    if 'resolved' in data:
        update_data['resolved'] = data['resolved']
    if 'reply' in data:
        db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$push': {
                'replies': {
                    'content': data['reply'],
                    'author': data.get('author', '匿名'),
                    'created_at': datetime.utcnow()
                }
            }}
        )
        return jsonify({'success': True})
    
    if update_data:
        update_data['updated_at'] = datetime.utcnow()
        db.comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': update_data}
        )
    
    comment = db.comments.find_one({'_id': ObjectId(comment_id)})
    if comment:
        comment['_id'] = str(comment['_id'])
        return jsonify(comment)
    
    return jsonify({'error': 'Comment not found'}), 404

@bp.route('/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    from .. import db
    from bson.objectid import ObjectId
    
    result = db.comments.delete_one({'_id': ObjectId(comment_id)})
    if result.deleted_count > 0:
        return jsonify({'success': True})
    
    return jsonify({'error': 'Comment not found'}), 404

@bp.route('/compliance', methods=['POST'])
def check_compliance():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    try:
        llm = get_llm_service()
        result = llm.check_compliance(data['content'])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/logic-check', methods=['POST'])
def check_logic():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请分析以下文章的逻辑一致性，检查是否存在：
1. 前后矛盾
2. 逻辑漏洞
3. 论证不充分
4. 结构混乱

文章内容：
{data['content']}

请以JSON格式返回：
{{
    "is_logical": true/false,
    "issues": [
        {{
            "type": "问题类型",
            "position": "位置描述",
            "description": "问题描述",
            "suggestion": "改进建议"
        }}
    ],
    "overall_assessment": "整体评估",
    "suggestions": ["改进建议1", "改进建议2"]
}}"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位逻辑分析专家，擅长发现文章中的逻辑问题。'},
            {'role': 'user', 'content': prompt}
        ])
        
        import re
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        
        return jsonify({'raw_result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/audit-flow', methods=['GET'])
def get_audit_flow():
    flows = [
        {
            'id': 'quick',
            'name': '快速审核',
            'description': '仅检查拼写和基本格式',
            'steps': [
                {'id': 'spelling', 'name': '拼写检查', 'required': True},
                {'id': 'format', 'name': '格式检查', 'required': True}
            ]
        },
        {
            'id': 'standard',
            'name': '标准审核',
            'description': '完整的内容和格式审核',
            'steps': [
                {'id': 'spelling', 'name': '拼写检查', 'required': True},
                {'id': 'grammar', 'name': '语法检查', 'required': True},
                {'id': 'logic', 'name': '逻辑检查', 'required': False},
                {'id': 'format', 'name': '格式检查', 'required': True}
            ]
        },
        {
            'id': 'strict',
            'name': '严格审核',
            'description': '全方面深度审核，包括合规性',
            'steps': [
                {'id': 'spelling', 'name': '拼写检查', 'required': True},
                {'id': 'grammar', 'name': '语法检查', 'required': True},
                {'id': 'logic', 'name': '逻辑检查', 'required': True},
                {'id': 'compliance', 'name': '合规检查', 'required': True},
                {'id': 'aitaste', 'name': 'AI味检测', 'required': False},
                {'id': 'format', 'name': '格式检查', 'required': True}
            ]
        }
    ]
    
    return jsonify(flows)

@bp.route('/audit', methods=['POST'])
def run_audit():
    data = request.json
    if not data or 'content' not in data or 'flow_id' not in data:
        return jsonify({'error': 'content and flow_id are required'}), 400
    
    content = data['content']
    flow_id = data['flow_id']
    
    try:
        llm = get_llm_service()
        results = {}
        
        if flow_id in ['standard', 'strict']:
            results['grammar'] = llm.check_grammar(content)
        
        if flow_id == 'strict':
            results['logic'] = check_logic_internal(content, llm)
            results['compliance'] = llm.check_compliance(content)
            results['ai_taste'] = llm.analyze_ai_taste(content)
        
        return jsonify({
            'flow_id': flow_id,
            'results': results,
            'timestamp': __import__('datetime').datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def check_logic_internal(content, llm):
    prompt = f"""请快速分析以下文章的逻辑一致性：

{content[:1500]}

请简要回答：是否存在明显的逻辑问题？如果有，请列出主要问题。"""
    
    result = llm.chat([
        {'role': 'system', 'content': '你是一位逻辑分析专家。'},
        {'role': 'user', 'content': prompt}
    ])
    
    return result
