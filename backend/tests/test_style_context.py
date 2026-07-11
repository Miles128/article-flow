from app.services.style_context import merge_writing_context


def test_merge_writing_context_injects_target_style():
    ctx = merge_writing_context({'style': 'professional', 'anti_ai_rules': False})
    assert '正式专业' in ctx['style']


def test_merge_writing_context_style_before_profile_prompt():
    ctx = merge_writing_context({
        'style': 'casual',
        'style_profile_id': 'nonexistent-id',
    })
    assert '轻松随意' in ctx['style']
