"""项目标准导出包 article-flow-export/"""
import json
import os
from datetime import datetime, timezone

from ..config_loader import CONFIG_DIR
from ..models import Project, ProjectContent, ResearchMaterial, Claim, Outline
from .step_migration import WORKFLOW_VERSION
from .publish_bundle_service import build_publish_bundle


def _latest_content(project_id: str, step: int) -> str:
    return ProjectContent.get_latest_content(project_id, step=step)


def build_export_files(project_id: str) -> dict[str, str]:
    project = Project.get_by_id(project_id)
    if not project:
        raise ValueError('Project not found')

    draft = _latest_content(project_id, 5)
    titles_raw = _latest_content(project_id, 6)
    outline = Outline.get_by_project(project_id)
    materials = ResearchMaterial.get_by_project(project_id)
    claims = Claim.get_by_project(project_id)

    variants: dict = {}
    variants_raw = _latest_content(project_id, 10)
    if variants_raw.strip().startswith('{'):
        try:
            parsed = json.loads(variants_raw)
            variants = parsed.get('variants', parsed)
        except json.JSONDecodeError:
            pass

    manifest = {
        'exportVersion': '1.0',
        'exportedAt': datetime.now(timezone.utc).isoformat(),
        'projectId': project_id,
        'title': project.get('selected_title') or project.get('title'),
        'coverLine': project.get('cover_line', ''),
        'contentType': project.get('content_type', 'article'),
        'workspace': project.get('workspace', 'general'),
        'currentStep': project.get('current_step', 1),
        'workflowVersion': project.get('workflow_version', WORKFLOW_VERSION),
        'files': [
            'manifest.json',
            'article.md',
            'outline.json',
            'titles.json',
            'publish.json',
            'research/materials.json',
            'research/claims.json',
            'rules/anti_ai_rules.yaml',
        ],
    }
    if variants:
        manifest['files'].extend([
            f'variants/{k}.md' for k in variants if isinstance(variants, dict)
        ])

    files: dict[str, str] = {
        'manifest.json': json.dumps(manifest, ensure_ascii=False, indent=2),
        'article.md': draft,
        'outline.json': json.dumps(outline or {'nodes': []}, ensure_ascii=False, indent=2),
        'titles.json': titles_raw or json.dumps({
            'selectedTitle': project.get('selected_title', ''),
            'coverLine': project.get('cover_line', ''),
        }, ensure_ascii=False, indent=2),
        'publish.json': json.dumps(build_publish_bundle(project_id), ensure_ascii=False, indent=2),
        'research/materials.json': json.dumps(materials, ensure_ascii=False, indent=2),
        'research/claims.json': json.dumps(claims, ensure_ascii=False, indent=2),
        'rules/anti_ai_rules.yaml': _anti_ai_rules_yaml(),
    }

    if isinstance(variants, dict):
        for key, body in variants.items():
            if isinstance(body, str) and body.strip():
                files[f'variants/{key}.md'] = body

    return files


def _anti_ai_rules_yaml() -> str:
    path = os.path.join(CONFIG_DIR, 'anti_ai_rules.yaml')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    return ''
