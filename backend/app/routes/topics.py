"""选题路由"""
from flask import Blueprint, request, jsonify
from ..decorators import with_llm
from ..models import Topic
from ..utils import parse_json_from_llm

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
    topic = Topic.get_by_id(topic_id)
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404
    return jsonify(topic)


@bp.route('/<topic_id>', methods=['PATCH'])
def update_topic(topic_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    allowed_fields = ['title', 'description', 'tags', 'priority', 'status', 'evaluation']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if Topic.update(topic_id, update_data):
        topic = Topic.get_by_id(topic_id)
        if topic:
            return jsonify(topic)

    return jsonify({'error': 'Topic not found'}), 404


@bp.route('/<topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    if Topic.delete(topic_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Topic not found'}), 404


@bp.route('/<topic_id>/evaluate', methods=['POST'])
@with_llm(require_content=False)
def evaluate_topic(llm, data, **kwargs):
    topic_id = kwargs.get('topic_id')

    topic = Topic.get_by_id(topic_id)
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404

    result = llm.chat([
        {'role': 'system', 'content': '你是一位专业的内容策划评估专家。'},
        {'role': 'user', 'content': f'请评估以下选题的潜力，从四个维度打分（0-100）：\n1. 趋势分数：话题热度和上升趋势\n2. 竞争分数：竞争激烈程度\n3. 受众分数：目标受众的兴趣程度\n4. 综合分数：加权综合评估\n\n选题：{topic.get("title", "")}\n描述：{topic.get("description", "")}\n标签：{topic.get("tags", [])}\n\n请以JSON格式返回：\n{{"trend_score": 80, "competition_score": 60, "audience_score": 75, "overall_score": 72, "analysis": "简短分析"}}'}
    ])

    evaluation = parse_json_from_llm(result)
    Topic.update(topic_id, {'evaluation': evaluation})
    return evaluation
