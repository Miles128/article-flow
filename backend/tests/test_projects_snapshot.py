"""Tests for project content update snapshots."""
import uuid

from app.models import ProjectContent
from app.services.draft_version_service import list_draft_versions, snapshot_draft, DRAFT_STEP


def test_content_update_flow_creates_snapshot():
    project_id = f'proj-put-{uuid.uuid4().hex[:8]}'
    old_content = '第一版正文'
    new_content = '第二版正文'
    doc = ProjectContent.create(project_id, DRAFT_STEP, 'markdown', old_content)

    snapshot_draft(project_id, old_content, note='保存前自动留档', step=DRAFT_STEP)
    ProjectContent.update(doc['_id'], new_content)

    versions = list_draft_versions(project_id, DRAFT_STEP)
    assert len(versions) == 1
    assert versions[0]['note'] == '保存前自动留档'
    assert ProjectContent.get_latest_content(project_id, DRAFT_STEP) == new_content
