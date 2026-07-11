"""内容层 API：框架、评估、playbook、发布包"""
from flask import Blueprint, request, jsonify
from ..content_loader import (
    get_frameworks,
    get_platform_prompts,
    get_eval_rubric,
    get_publish_gate,
    get_seo_rules,
    get_title_formulas,
    get_humanize_checklist,
)
from ..decorators import with_llm
from ..services.anti_ai_service import check_export_gate
from ..services.content_eval_service import eval_article_rules, run_critic
from ..services.playbook_service import learn_from_edit, get_playbook_learnings
from ..services.publish_bundle_service import build_publish_bundle
from ..models import Project, ProjectContent

bp = Blueprint('content', __name__)


@bp.route('/frameworks', methods=['GET'])
def list_frameworks():
    frameworks = get_frameworks()
    return jsonify({'frameworks': list(frameworks.values())})


@bp.route('/config', methods=['GET'])
def content_config():
    return jsonify({
        'frameworks': list(get_frameworks().values()),
        'eval_rubric': get_eval_rubric(),
        'publish_gate': get_publish_gate(),
        'seo_rules': get_seo_rules(),
        'title_formulas': get_title_formulas(),
        'humanize_checklist': get_humanize_checklist(),
        'platforms': list(get_platform_prompts().get('platforms', {}).keys()),
    })


@bp.route('/eval', methods=['POST'])
def eval_content():
    data = request.json or {}
    content = data.get('content', '')
    title = data.get('title', '')
    if not content:
        return jsonify({'error': 'content is required'}), 400
    return jsonify(eval_article_rules(content, title))


@bp.route('/critic', methods=['POST'])
@with_llm(require_content=False)
def critic_content(llm, data):
    content = data.get('content', '')
    if not content:
        return jsonify({'error': 'content is required'}), 400
    result = run_critic(
        llm,
        content,
        topic=data.get('topic', ''),
        platform=data.get('platform', 'wechat'),
        context=data.get('context', ''),
    )
    return jsonify(result)


@bp.route('/gate-check', methods=['POST'])
def gate_check():
    data = request.json or {}
    content = data.get('content', '')
    project_id = data.get('project_id') or data.get('projectId')
    if not content and project_id:
        items = list(ProjectContent.get_by_project_step(project_id, 5))
        if items:
            latest = max(items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
            content = latest.get('content', '')
    if not content:
        return jsonify({'error': 'content or project_id with draft required'}), 400
    return jsonify(check_export_gate(content))


@bp.route('/publish-bundle', methods=['GET'])
def get_publish_bundle():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    try:
        return jsonify(build_publish_bundle(project_id))
    except ValueError as e:
        return jsonify({'error': str(e)}), 404


@bp.route('/publish-bundle', methods=['POST'])
def save_publish_bundle():
    data = request.json or {}
    project_id = data.get('project_id') or data.get('projectId')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    payload = {
        'selected_title': data.get('title', ''),
        'cover_line': data.get('coverLine') or data.get('cover_line', ''),
        'hook': data.get('hook', ''),
        'digest': data.get('digest', ''),
        'closing_question': data.get('closingQuestion') or data.get('closing_question', ''),
        'image_briefs': data.get('imageBriefs') or data.get('image_briefs', []),
    }
    import json as json_lib
    ProjectContent.create(
        project_id=project_id,
        step=6,
        content_type='json',
        content=json_lib.dumps(payload, ensure_ascii=False, indent=2),
    )
    Project.update(project_id, {
        'selected_title': payload['selected_title'],
        'cover_line': payload['cover_line'],
    })
    return jsonify(build_publish_bundle(project_id))


@bp.route('/playbook/learn', methods=['POST'])
def playbook_learn():
    data = request.json or {}
    before = data.get('before', '')
    after = data.get('after', '')
    try:
        entry = learn_from_edit(
            before,
            after,
            project_id=data.get('project_id') or data.get('projectId', ''),
            style_profile_id=data.get('style_profile_id') or data.get('styleProfileId', ''),
        )
        return jsonify(entry)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/playbook/learnings', methods=['GET'])
def playbook_learnings():
    limit = request.args.get('limit', 20, type=int)
    return jsonify({'learnings': get_playbook_learnings(limit)})
