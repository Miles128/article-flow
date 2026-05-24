"""工作流步骤号迁移（7 步 → 10 步）"""
from .. import db_data as db

WORKFLOW_VERSION = 2


def _has_step6_titles(project_id: str) -> bool:
    for doc in db['project_contents'].find({'project_id': project_id, 'step': 6}):
        if doc.get('content_type') == 'json' or doc.get('content', '').strip().startswith('{'):
            return True
    return False


def migrate_article_step(project: dict) -> int:
    step = int(project.get('current_step', 1))
    pid = project['_id']
    has_titles = bool(project.get('selected_title')) or _has_step6_titles(pid)

    if step == 6 and not has_titles:
        return 7
    if step == 7:
        return 7 if has_titles else 8
    if step == 8:
        return 8 if has_titles else 9
    return min(step, 10)


def apply_workflow_migration(project: dict | None) -> dict | None:
    if not project:
        return project
    if int(project.get('workflow_version', 1)) >= WORKFLOW_VERSION:
        return project
    if project.get('content_type', 'article') != 'article':
        from ..models import Project
        Project.update(project['_id'], {'workflow_version': WORKFLOW_VERSION})
        project['workflow_version'] = WORKFLOW_VERSION
        return project

    new_step = migrate_article_step(project)
    from ..models import Project
    Project.update(project['_id'], {
        'current_step': new_step,
        'workflow_version': WORKFLOW_VERSION,
    })
    project['current_step'] = new_step
    project['workflow_version'] = WORKFLOW_VERSION
    return project
