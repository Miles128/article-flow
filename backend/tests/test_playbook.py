import os
import pytest

from app.services.playbook_service import learn_from_edit, get_playbook_learnings


@pytest.fixture(autouse=True)
def clean_playbook(tmp_path, monkeypatch):
    path = tmp_path / 'playbook_learnings.json'
    monkeypatch.setattr('app.services.playbook_service.PLAYBOOK_PATH', str(path))
    yield path


def test_learn_from_edit_records_diff(clean_playbook):
    before = '首先值得注意的是，综上所述效果显著。'
    after = '说实话，我踩坑之后才发现，效果其实一般。'
    entry = learn_from_edit(before, after, project_id='p1')
    assert entry['removed_phrases']
    assert os.path.exists(clean_playbook)
    items = get_playbook_learnings(5)
    assert len(items) >= 1
    assert items[0]['project_id'] == 'p1'


def test_learn_from_edit_rejects_identical():
    with pytest.raises(ValueError):
        learn_from_edit('same text', 'same text')
