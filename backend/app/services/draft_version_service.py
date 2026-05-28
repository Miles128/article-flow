"""草稿版本快照与恢复"""
from __future__ import annotations

import re

from ..models import ProjectContent, VersionHistory

DRAFT_STEP = 5
MAX_VERSIONS = 30
PREVIEW_CHARS = 120


def _word_count(text: str) -> int:
    if not text:
        return 0
    cjk = len(re.findall(r'[\u4e00-\u9fff]', text))
    latin = len(re.findall(r'[A-Za-z]+', text))
    return cjk + latin


def _next_version_number(project_id: str, step: int = DRAFT_STEP) -> int:
    versions = list(VersionHistory.get_by_project_step(project_id, step))
    if not versions:
        return 1
    return int(versions[0].get('version_number', 0)) + 1


def _prune_old_versions(project_id: str, step: int = DRAFT_STEP) -> None:
    versions = list(VersionHistory.get_by_project_step(project_id, step))
    if len(versions) <= MAX_VERSIONS:
        return
    for stale in versions[MAX_VERSIONS:]:
        from .. import db_data as db
        db['version_history'].delete_one({'_id': stale['_id']})


def _latest_snapshot_content(project_id: str, step: int = DRAFT_STEP) -> str:
    versions = list(VersionHistory.get_by_project_step(project_id, step))
    if not versions:
        return ''
    return versions[0].get('content') or ''


def snapshot_draft(
    project_id: str,
    content: str,
    note: str = '保存前快照',
    step: int = DRAFT_STEP,
) -> dict | None:
    body = (content or '').strip()
    if not body:
        return None
    if body == _latest_snapshot_content(project_id, step).strip():
        return None
    version = VersionHistory.create(
        project_id=project_id,
        step=step,
        content=body,
        version_number=_next_version_number(project_id, step),
        note=note,
    )
    _prune_old_versions(project_id, step)
    return version


def list_draft_versions(project_id: str, step: int = DRAFT_STEP) -> list[dict]:
    items = []
    for row in VersionHistory.get_by_project_step(project_id, step):
        content = row.get('content') or ''
        preview = content[:PREVIEW_CHARS].replace('\n', ' ')
        if len(content) > PREVIEW_CHARS:
            preview += '…'
        items.append({
            '_id': row['_id'],
            'project_id': row.get('project_id'),
            'step': row.get('step'),
            'version_number': row.get('version_number'),
            'note': row.get('note') or '',
            'created_at': row.get('created_at'),
            'word_count': _word_count(content),
            'preview': preview,
        })
    return items


def get_draft_version(version_id: str) -> dict | None:
    from .. import db_data as db
    return db['version_history'].find_one({'_id': version_id})


def restore_draft_version(
    project_id: str,
    version_id: str,
    current_content: str = '',
    step: int = DRAFT_STEP,
) -> dict:
    version = get_draft_version(version_id)
    if not version or version.get('project_id') != project_id:
        raise ValueError('version not found')
    restored = (version.get('content') or '').strip()
    if not restored:
        raise ValueError('version content is empty')

    current = (current_content or ProjectContent.get_latest_content(project_id, step)).strip()
    if current and current != restored:
        snapshot_draft(project_id, current, note='恢复前自动备份', step=step)

    items = list(ProjectContent.get_by_project_step(project_id, step))
    if items:
        latest = max(items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
        ProjectContent.update(latest['_id'], restored)
        content_id = latest['_id']
    else:
        doc = ProjectContent.create(
            project_id=project_id,
            step=step,
            content_type='markdown',
            content=restored,
        )
        content_id = doc['_id']

    return {
        'content': restored,
        'content_id': content_id,
        'version_number': version.get('version_number'),
        'restored_from': version_id,
    }
