"""写作意图（config/writing_intents.yaml）"""
from __future__ import annotations

from ..config_loader import get_writing_intent_catalog

ORNAMENTAL_INTENTS = frozenset({'literary_essay'})


def normalize_writing_intent(value: str | None) -> str:
    catalog = get_writing_intent_catalog()
    intents = catalog.get('intents') or {}
    default = str(catalog.get('default') or 'insight_commentary')
    if value and value in intents:
        return value
    return default


def get_writing_intent_meta(intent_id: str) -> dict[str, str] | None:
    intents = get_writing_intent_catalog().get('intents') or {}
    meta = intents.get(intent_id)
    if not meta or not isinstance(meta, dict):
        return None
    return {
        'id': intent_id,
        'label': str(meta.get('label') or intent_id),
        'description': str(meta.get('description') or ''),
    }


def allows_literary_rhetoric(intent_id: str) -> bool:
    return intent_id in ORNAMENTAL_INTENTS


def parse_writing_intent_from_data(data: dict | None) -> str:
    if not data:
        return normalize_writing_intent(None)
    raw = data.get('writing_intent') or data.get('writingIntent')
    if not raw and isinstance(data.get('context'), dict):
        ctx = data['context']
        raw = ctx.get('writing_intent') or ctx.get('writingIntent')
    return normalize_writing_intent(str(raw).strip() if raw else None)
