"""从人工改稿中学习风格规律（playbook）"""
import json
import os
import re
from datetime import datetime, timezone

from .. import db_data as db

PLAYBOOK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'data',
    'playbook_learnings.json',
)


def _load_learnings() -> list[dict]:
    if not os.path.exists(PLAYBOOK_PATH):
        return []
    try:
        with open(PLAYBOOK_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_learnings(items: list[dict]) -> None:
    os.makedirs(os.path.dirname(PLAYBOOK_PATH), exist_ok=True)
    with open(PLAYBOOK_PATH, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def learn_from_edit(
    before: str,
    after: str,
    project_id: str = '',
    style_profile_id: str = '',
) -> dict:
    before = (before or '').strip()
    after = (after or '').strip()
    if not before or not after or before == after:
        raise ValueError('before 与 after 必须有差异')

    removed = []
    for phrase in ('首先', '其次', '综上所述', '值得注意的是', '赋能', '底层逻辑'):
        if phrase in before and phrase not in after:
            removed.append(phrase)

    added_oral = []
    for phrase in ('说实话', '讲真', '我觉得', '踩坑', '说白了'):
        if phrase not in before and phrase in after:
            added_oral.append(phrase)

    len_before = len(re.findall(r'[。！？!?]', before))
    len_after = len(re.findall(r'[。！？!?]', after))

    entry = {
        'id': datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f'),
        'project_id': project_id,
        'style_profile_id': style_profile_id,
        'learned_at': datetime.now(timezone.utc).isoformat(),
        'removed_phrases': removed,
        'added_oral_markers': added_oral,
        'sentence_delta': len_after - len_before,
        'note': '用户改稿：减少套话、增加口语/具体表达' if removed or added_oral else '用户改稿：句式或段落调整',
    }

    items = _load_learnings()
    items.insert(0, entry)
    items = items[:200]
    _save_learnings(items)

    if style_profile_id:
        profile = db['style_profiles'].find_one({'_id': style_profile_id})
        if profile:
            playbook = profile.get('playbook', [])
            playbook.insert(0, entry)
            db['style_profiles'].update_one(
                {'_id': style_profile_id},
                {'$set': {'playbook': playbook[:50]}},
            )

    return entry


def get_playbook_learnings(limit: int = 20) -> list[dict]:
    return _load_learnings()[:limit]
