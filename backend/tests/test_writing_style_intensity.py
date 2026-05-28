from app.prompts.writing_style_intensity import (
    format_style_prompt,
    resolve_style_intensity,
)


def test_humorous_default_is_low():
    assert resolve_style_intensity('humorous', None) == 28


def test_humorous_caps_high_request():
    assert resolve_style_intensity('humorous', 90) == 50


def test_format_includes_percent():
    text = format_style_prompt('humorous', 28)
    assert '28%' in text
    assert '轻微' in text
    assert '禁止连续玩笑' in text


def test_professional_moderate_band():
    text = format_style_prompt('professional', 55)
    assert '55%' in text
    assert '适度' in text
