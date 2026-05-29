from app.prompts.writing_style_intensity import (
    format_style_prompt,
    get_destylize_instruction,
    normalize_style_id,
    resolve_style_intensity,
)


def test_humorous_default_is_low():
    assert resolve_style_intensity('humorous', None) == 28


def test_poetic_caps_and_default():
    assert resolve_style_intensity('poetic', None) == 28
    assert resolve_style_intensity('poetic', 90) == 45


def test_humorous_caps_high_request():
    assert resolve_style_intensity('humorous', 90) == 50


def test_destylize_only_when_forced():
    assert get_destylize_instruction('professional', force=False) == ''
    assert '归正' in get_destylize_instruction('professional', force=True)
    assert get_destylize_instruction('poetic', force=True) == ''


def test_format_includes_percent():
    text = format_style_prompt('humorous', 28)
    assert '28%' in text
    assert '轻微' in text
    assert '禁止连续玩笑' in text


def test_professional_moderate_band():
    text = format_style_prompt('professional', 55)
    assert '55%' in text
    assert '适度' in text


def test_conversational_alias_maps_to_casual():
    assert normalize_style_id('conversational') == 'casual'
    assert '轻松' in format_style_prompt('conversational', 30)
