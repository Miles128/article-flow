from flask import Blueprint, request, jsonify
from ..services.style_service import StyleProfile, StyleAnalyzer

bp = Blueprint('style', __name__)


@bp.route('/', methods=['GET'])
def list_profiles():
    profiles = StyleProfile.get_all()
    return jsonify(profiles)


@bp.route('/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    profile = StyleProfile.get_by_id(profile_id)
    if not profile:
        return jsonify({'error': '风格档案不存在'}), 404
    return jsonify(profile)


@bp.route('/', methods=['POST'])
def create_profile():
    data = request.get_json() or {}
    name = data.get('name', '未命名风格')
    texts = data.get('texts', [])

    if not texts:
        return jsonify({'error': '请提供至少一段文本'}), 400

    style_data = StyleAnalyzer.analyze_texts(texts)
    if not style_data:
        return jsonify({'error': '文本内容不足，无法分析'}), 400

    source_texts = [t[:500] for t in texts if t.strip()]

    profile = StyleProfile.create(name=name, style_data=style_data, source_texts=source_texts)
    return jsonify(profile), 201


@bp.route('/analyze', methods=['POST'])
def analyze_texts():
    data = request.get_json() or {}
    texts = data.get('texts', [])

    if not texts:
        return jsonify({'error': '请提供至少一段文本'}), 400

    style_data = StyleAnalyzer.analyze_texts(texts)
    if not style_data:
        return jsonify({'error': '文本内容不足，无法分析'}), 400

    prompt = StyleAnalyzer.generate_style_prompt(style_data)

    return jsonify({
        'style_data': style_data,
        'style_prompt': prompt,
    })


@bp.route('/<profile_id>', methods=['DELETE'])
def delete_profile(profile_id):
    ok = StyleProfile.delete(profile_id)
    if not ok:
        return jsonify({'error': '风格档案不存在'}), 404
    return jsonify({'message': '已删除'})


@bp.route('/<profile_id>/prompt', methods=['GET'])
def get_style_prompt(profile_id):
    profile = StyleProfile.get_by_id(profile_id)
    if not profile:
        return jsonify({'error': '风格档案不存在'}), 404

    prompt = StyleAnalyzer.generate_style_prompt(profile.get('style_data', {}))
    return jsonify({'prompt': prompt, 'name': profile.get('name', '')})
