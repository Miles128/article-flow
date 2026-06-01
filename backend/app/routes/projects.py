"""项目路由 - 级联删除通过 Model 层"""
import io
import zipfile

from flask import Blueprint, request, jsonify, send_file
from ..models import Project, ProjectContent
from ..services.step_migration import apply_workflow_migration
from ..services.export_service import build_export_files
from ..services.anti_ai_service import check_export_gate
from ..services.draft_version_service import snapshot_draft, DRAFT_STEP

bp = Blueprint('projects', __name__)


def _migrate_list(projects):
    return [apply_workflow_migration(p) for p in projects]


@bp.route('', methods=['GET'])
def get_projects():
    projects = _migrate_list(Project.get_all())
    return jsonify(projects)


@bp.route('', methods=['POST'])
def create_project():
    data = request.json
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400

    project = Project.create(
        title=data['title'],
        workspace=data.get('workspace', 'general'),
        target_word_count=data.get('target_word_count', 2000),
        content_type=data.get('content_type', 'article')
    )

    return jsonify(project), 201


@bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(apply_workflow_migration(project))


@bp.route('/<project_id>', methods=['PATCH'])
def update_project(project_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    allowed_fields = ['title', 'workspace', 'content_type', 'current_step', 'word_count',
                      'target_word_count', 'ai_taste_score', 'status', 'breakpoints']

    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if Project.update(project_id, update_data):
        project = Project.get_by_id(project_id)
        return jsonify(project)

    return jsonify({'error': 'Project not found'}), 404


@bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目 - 级联删除通过 Model 层聚合根实现"""
    if not Project.get_by_id(project_id):
        return jsonify({'error': 'Project not found'}), 404

    # Model 层的 delete 已包含级联删除
    Project.delete(project_id)
    return jsonify({'success': True})


@bp.route('/<project_id>/contents', methods=['GET'])
def get_project_contents(project_id):
    step = request.args.get('step', type=int)
    if step is not None:
        contents = ProjectContent.get_by_project_step(project_id, step)
    else:
        from .. import db_data as db
        contents = list(db['project_contents'].find({'project_id': project_id}))

    return jsonify(contents)


@bp.route('/<project_id>/contents', methods=['POST'])
def create_project_content(project_id):
    data = request.json
    if not data or 'step' not in data or 'content' not in data:
        return jsonify({'error': 'Step and content are required'}), 400

    content = ProjectContent.create(
        project_id=project_id,
        step=data['step'],
        content_type=data.get('content_type', 'markdown'),
        content=data['content']
    )

    return jsonify(content), 201


@bp.route('/<project_id>/contents/<content_id>', methods=['PUT'])
def update_project_content(project_id, content_id):
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'Content is required'}), 400

    from .. import db_data as db
    existing = db['project_contents'].find_one({'_id': content_id})
    if not existing or existing.get('project_id') != project_id:
        return jsonify({'error': 'Content not found'}), 404

    new_content = data['content']
    old_content = existing.get('content') or ''
    step = int(existing.get('step', DRAFT_STEP))
    if step == DRAFT_STEP and old_content.strip() and old_content != new_content:
        snapshot_draft(project_id, old_content, note='保存前自动留档', step=step)

    if ProjectContent.update(content_id, new_content):
        content = db['project_contents'].find_one({'_id': content_id})
        if content:
            return jsonify(content)

    return jsonify({'error': 'Content not found'}), 404


@bp.route('/<project_id>/export', methods=['GET'])
def export_project(project_id):
    """标准导出包 ZIP（根目录 article-flow-export/）"""
    if not Project.get_by_id(project_id):
        return jsonify({'error': 'Project not found'}), 404

    force = request.args.get('force', '').lower() in ('1', 'true', 'yes')
    items = list(ProjectContent.get_by_project_step(project_id, 5))
    draft = ''
    if items:
        latest = max(items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
        draft = latest.get('content', '') or ''
    if draft and not force:
        gate = check_export_gate(draft)
        if not gate['allowed']:
            return jsonify({'error': gate['message'], 'gate': gate}), 403

    try:
        files = build_export_files(project_id)
    except ValueError:
        return jsonify({'error': 'Project not found'}), 404

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for path, body in files.items():
            zf.writestr(f'article-flow-export/{path}', body or '')
    buf.seek(0)

    project = Project.get_by_id(project_id)
    safe_name = (project.get('title') or project_id)[:40].replace('/', '-')
    return send_file(
        buf,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{safe_name}-article-flow-export.zip',
    )


@bp.route('/<project_id>/stats', methods=['GET'])
def get_project_stats(project_id):
    """聚合项目统计数据"""
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    from ..services.draft_version_service import list_draft_versions
    from ..services.anti_ai_service import scan_content

    from ..utils_words import count_article_words

    ARTICLE_WORKFLOW_STEPS = 10

    # 步骤完成情况
    steps_status: list[dict] = []
    for step in range(1, ARTICLE_WORKFLOW_STEPS + 1):
        items = list(ProjectContent.get_by_project_step(project_id, step))
        has_content = any((i.get('content') or '').strip() for i in items)
        steps_status.append({
            'step': step,
            'has_content': has_content,
            'content_count': len(items),
        })

    # 字数统计
    draft_items = list(ProjectContent.get_by_project_step(project_id, 5))
    draft_text = ''
    if draft_items:
        latest = max(draft_items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
        draft_text = latest.get('content', '') or ''
    char_count = count_article_words(draft_text)

    # AI 味评分
    ai_scan = scan_content(draft_text) if draft_text else None

    # 版本历史
    versions = list_draft_versions(project_id)
    version_count = len(versions)

    # 版本趋势：取最近 20 条版本记录
    version_trend: list[dict] = []
    for v in versions[-20:]:
        vc = v.get('content', '') or ''
        v_scan = scan_content(vc)
        version_trend.append({
            'version': v.get('version_number', 0),
            'note': v.get('note', ''),
            'created_at': v.get('created_at', ''),
            'ai_score': v_scan.get('score', 0) if isinstance(v_scan, dict) else 0,
            'word_count': count_article_words(vc),
        })

    return jsonify({
        'project_title': project.get('title', ''),
        'status': project.get('status', 'draft'),
        'current_step': project.get('current_step', 1),
        'target_word_count': project.get('target_word_count', 0),
        'word_count': char_count,
        'ai_taste_score': ai_scan.get('score', 0) if ai_scan else 0,
        'ai_target_score': ai_scan.get('target_score', 30) if ai_scan else 30,
        'ai_match_count': ai_scan.get('match_count', 0) if ai_scan else 0,
        'version_count': version_count,
        'steps_status': steps_status,
        'version_trend': version_trend,
        'created_at': project.get('created_at', ''),
        'updated_at': project.get('updated_at', ''),
    })
