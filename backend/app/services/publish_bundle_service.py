"""发布六段式 JSON 与门禁"""
import json
import re
from datetime import datetime, timezone

from ..content_loader import get_publish_gate
from ..models import Project, ProjectContent
from ..services.anti_ai_service import scan_content
from ..services.content_eval_service import eval_article_rules


def _latest_draft(project_id: str) -> str:
    return ProjectContent.get_latest_content(project_id, step=5)


def _titles_json(project_id: str, project: dict) -> dict:
    items = list(ProjectContent.get_by_project_step(project_id, 6))
    if items:
        latest = max(items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
        raw = latest.get('content', '')
        if raw.strip().startswith('{'):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                pass
    return {
        'selected_title': project.get('selected_title', ''),
        'cover_line': project.get('cover_line', ''),
    }


def build_publish_bundle(project_id: str) -> dict:
    project = Project.get_by_id(project_id)
    if not project:
        raise ValueError('Project not found')

    draft = _latest_draft(project_id)
    titles = _titles_json(project_id, project)
    title = titles.get('selected_title') or titles.get('selectedTitle') or project.get('selected_title') or project.get('title', '')
    cover = titles.get('cover_line') or titles.get('coverLine') or project.get('cover_line', '')

    hook = titles.get('hook') or titles.get('opening_hook') or ''
    digest = titles.get('digest') or titles.get('summary') or ''
    closing = titles.get('closing_question') or titles.get('closingQuestion') or ''

    if not digest and draft:
        digest = re.sub(r'[#>*\-\s]+', '', draft[:120]).strip()[:54]

    body = draft
    image_briefs = titles.get('image_briefs') or titles.get('imageBriefs') or []

    gate = get_publish_gate()
    scan = scan_content(draft) if draft else {'score': 100, 'gate_status': 'fail'}
    eval_result = eval_article_rules(draft, title) if draft else {'total_score': 0, 'passed': False}

    bundle = {
        'version': gate.get('publish_bundle_version', '1.0'),
        'exportedAt': datetime.now(timezone.utc).isoformat(),
        'projectId': project_id,
        'title': title,
        'hook': hook,
        'digest': digest,
        'body': body,
        'closingQuestion': closing,
        'coverLine': cover,
        'imageBriefs': image_briefs,
        'quality': {
            'aiScore': scan.get('score', 100),
            'gateStatus': scan.get('gate_status', 'fail'),
            'evalTotal': eval_result.get('total_score', 0),
            'evalPassed': eval_result.get('passed', False),
        },
    }
    return bundle
