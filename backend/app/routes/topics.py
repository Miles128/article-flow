from flask import Blueprint, request, jsonify
from ..models import Topic

bp = Blueprint('topics', __name__)

@bp.route('', methods=['GET'])
def get_topics():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    
    topics = Topic.get_by_project(project_id)
    return jsonify(topics)

@bp.route('', methods=['POST'])
def create_topic():
    data = request.json
    if not data or 'project_id' not in data or 'title' not in data:
        return jsonify({'error': 'project_id and title are required'}), 400
    
    topic = Topic.create(
        project_id=data['project_id'],
        title=data['title'],
        description=data.get('description', ''),
        tags=data.get('tags', []),
        priority=data.get('priority', 1)
    )
    
    return jsonify(topic), 201

@bp.route('/<topic_id>', methods=['GET'])
def get_topic(topic_id):
    from .. import db_data as _db
    from bson.objectid import ObjectId
    
    topic = db.topics.find_one({'_id': ObjectId(topic_id)})
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404
    
    topic['_id'] = str(topic['_id'])
    return jsonify(topic)

@bp.route('/<topic_id>', methods=['PATCH'])
def update_topic(topic_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    allowed_fields = ['title', 'description', 'tags', 'priority', 'status', 'evaluation']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if Topic.update(topic_id, update_data):
        from .. import db_data as _db
        from bson.objectid import ObjectId
        topic = db.topics.find_one({'_id': ObjectId(topic_id)})
        if topic:
            topic['_id'] = str(topic['_id'])
            return jsonify(topic)
    
    return jsonify({'error': 'Topic not found'}), 404

@bp.route('/<topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    from .. import db_data as _db
    from bson.objectid import ObjectId
    
    result = db.topics.delete_one({'_id': ObjectId(topic_id)})
    if result.deleted_count > 0:
        return jsonify({'success': True})
    
    return jsonify({'error': 'Topic not found'}), 404

@bp.route('/<topic_id>/evaluate', methods=['POST'])
def evaluate_topic(topic_id):
    from ..services.llm_service import get_llm_service
    
    from .. import db_data as _db
    from bson.objectid import ObjectId
    
    topic = db.topics.find_one({'_id': ObjectId(topic_id)})
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404
    
    llm = get_llm_service()
    
    prompt = f"""请评估以下选题的潜力，从四个维度打分（0-100）：
1. 趋势分数：话题热度和上升趋势
2. 竞争分数：竞争激烈程度（分数越低表示竞争越小）
3. 受众分数：目标受众的兴趣程度
4. 综合分数：加权综合评估

选题：{topic.get('title', '')}
描述：{topic.get('description', '')}
标签：{topic.get('tags', [])}

请以JSON格式返回：
{{
    "trend_score": 80,
    "competition_score": 60,
    "audience_score": 75,
    "overall_score": 72,
    "analysis": "简短的分析说明"
}}"""
    
    try:
        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的内容策划评估专家。'},
            {'role': 'user', 'content': prompt}
        ])
        
        import json
        evaluation = json.loads(result)
        
        update_data = {'evaluation': evaluation}
        Topic.update(topic_id, update_data)
        
        return jsonify(evaluation)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
