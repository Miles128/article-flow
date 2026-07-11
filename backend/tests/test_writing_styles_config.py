from app.config_loader import (
    get_default_writing_style,
    get_writing_rhythm_limits,
    get_writing_styles,
    get_writing_styles_api_payload,
)
from app.prompts.writing_quality import get_rhythm_writing_rules


def test_writing_styles_from_yaml():
    styles = get_writing_styles()
    assert 'professional' in styles
    assert '正式' in styles['professional'] or '专业' in styles['professional']


def test_writing_styles_api_payload():
    payload = get_writing_styles_api_payload()
    assert payload['default'] == 'professional'
    assert payload['intensity']['max'] == 85
    ids = [s['id'] for s in payload['styles']]
    assert 'casual' in ids
    labels = {s['id']: s['label'] for s in payload['styles']}
    assert labels['professional'] == '正式'
    humorous = next(s for s in payload['styles'] if s['id'] == 'humorous')
    assert humorous['default_intensity'] == 28
    assert humorous['max_intensity'] == 50
    poetic = next(s for s in payload['styles'] if s['id'] == 'poetic')
    assert poetic['max_intensity'] == 45


def test_rhythm_rules_use_config():
    lim = get_writing_rhythm_limits()
    rules = get_rhythm_writing_rules()
    assert str(lim['max_sentence_chars']) in rules
    assert '长段' in rules or '段' in rules


def test_default_writing_style():
    assert get_default_writing_style() == 'professional'
