"""Tests for draft version snapshots."""
import uuid

from app.services.draft_version_service import (
    snapshot_draft,
    list_draft_versions,
    restore_draft_version,
    DRAFT_STEP,
)
from app.models import VersionHistory, ProjectContent


def _project_id(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def test_snapshot_draft_skips_duplicate():
    project_id = _project_id('proj-snap-dup')
    first = snapshot_draft(project_id, '第一版草稿内容', note='测试')
    assert first is not None
    second = snapshot_draft(project_id, '第一版草稿内容', note='重复')
    assert second is None


def test_snapshot_and_list_versions():
    project_id = _project_id('proj-snap-list')
    snapshot_draft(project_id, '版本一', note='v1')
    snapshot_draft(project_id, '版本二更长一些的内容', note='v2')
    items = list_draft_versions(project_id, DRAFT_STEP)
    assert len(items) == 2
    assert items[0]['version_number'] == 2
    assert items[0]['word_count'] > 0
    assert 'preview' in items[0]


def test_restore_draft_version():
    project_id = _project_id('proj-restore')
    v1 = snapshot_draft(project_id, '旧稿内容', note='旧版')
    assert v1 is not None
    ProjectContent.create(project_id, DRAFT_STEP, 'markdown', '当前错误稿')

    result = restore_draft_version(project_id, v1['_id'], current_content='当前错误稿')
    assert result['content'] == '旧稿内容'
    assert ProjectContent.get_latest_content(project_id, DRAFT_STEP) == '旧稿内容'

    backups = list(VersionHistory.get_by_project_step(project_id, DRAFT_STEP))
    notes = [b.get('note') for b in backups]
    assert '恢复前自动备份' in notes
