from flask import Blueprint, request, jsonify
from ..models import Project, ProjectContent

bp = Blueprint('projects', __name__)

@bp.route('', methods=['GET'])
def get_projects():
    projects = Project.get_all()
    return jsonify(projects)

@bp.route('', methods=['POST'])
def create_project():
    data = request.json
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400
    
    project = Project.create(
        title=data['title'],
        workspace=data.get('workspace', 'general'),
        target_word_count=data.get('target_word_count', 2000)
    )
    
    return jsonify(project), 201

@bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.get_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(project)

@bp.route('/<project_id>', methods=['PATCH'])
def update_project(project_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    allowed_fields = ['title', 'workspace', 'current_step', 'word_count', 
                      'target_word_count', 'ai_taste_score', 'status', 'breakpoints']
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if Project.update(project_id, update_data):
        project = Project.get_by_id(project_id)
        return jsonify(project)
    
    return jsonify({'error': 'Project not found'}), 404

@bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    if Project.delete(project_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Project not found'}), 404

@bp.route('/<project_id>/contents', methods=['GET'])
def get_project_contents(project_id):
    step = request.args.get('step', type=int)
    if step is not None:
        contents = ProjectContent.get_by_project_step(project_id, step)
    else:
        from .. import db_data as _db
        contents = list(db.project_contents.find({'project_id': project_id}))
        for c in contents:
            c['_id'] = str(c['_id'])
    
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
    
    if ProjectContent.update(content_id, data['content']):
        from .. import db_data as _db
        content = db.project_contents.find_one({'_id': content_id})
        if content:
            content['_id'] = str(content['_id'])
            return jsonify(content)
    
    return jsonify({'error': 'Content not found'}), 404
