from app.prompts.writing_intent import (
    allows_literary_rhetoric,
    normalize_writing_intent,
    parse_writing_intent_from_data,
)
from app.prompts.writing_quality import get_writing_quality_rules
from app.services.anti_ai_service import (
    get_anti_ai_generation_prompt,
    get_anti_ai_polish_prompt,
)
from app.services.style_rewrite_service import score_unit_for_style


def test_normalize_writing_intent_defaults():
    assert normalize_writing_intent(None) == 'insight_commentary'
    assert normalize_writing_intent('literary_essay') == 'literary_essay'


def test_parse_writing_intent_from_data():
    assert parse_writing_intent_from_data({'writing_intent': 'informational'}) == 'informational'


def test_insight_rules_in_quality():
    rules = get_writing_quality_rules('insight_commentary')
    assert '洞察与思想' in rules
    assert '段落信息密度' in rules
    assert '新信息' in rules and '新视角' in rules and '画面感' in rules


def test_generation_anti_ai_lighter_than_polish():
    gen = get_anti_ai_generation_prompt()
    polish = get_anti_ai_polish_prompt()
    assert '长句必须拆短' not in gen
    assert '长句' in polish or '占比' in polish


def test_literary_intent_preserves_rhetoric_scoring():
    text = '夜色仿佛一层薄纱。'
    pro_score = score_unit_for_style(text, 'professional', writing_intent='informational')
    lit_score = score_unit_for_style(text, 'professional', writing_intent='literary_essay')
    assert lit_score < pro_score
    assert allows_literary_rhetoric('literary_essay')
