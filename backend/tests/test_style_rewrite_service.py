from app.services.style_rewrite_service import (
    compute_cover,
    compute_cross_weights,
    join_text_units,
    plan_rewrite_assignments_for_units,
    should_use_selective_rewrite,
    split_text_units,
    TextUnit,
)


def test_cover_at_low_intensity():
    assert abs(compute_cover(10) - 0.10) < 0.01
    assert abs(compute_cover(18) - 0.18) < 0.01
    assert abs(compute_cover(30) - 0.30) < 0.01
    assert abs(compute_cover(60) - 0.6) < 0.01


def test_cross_weights_60_anchor():
    w = compute_cross_weights(60)
    assert abs(w.cover - 0.6) < 0.01
    assert abs(w.light - 0.4) < 0.02
    assert abs(w.medium - 0.2) < 0.02
    assert w.strong == 0.0


def test_selective_only_below_95():
    assert should_use_selective_rewrite('professional', 20)
    assert not should_use_selective_rewrite('professional', 95)
    assert not should_use_selective_rewrite('professional', 50, restore_plain=True)


def test_plan_picks_fraction_at_20pct():
    _leading, units = split_text_units(
        ''.join(f'句子{i}内容较长一些便于评分。' for i in range(10)),
    )
    if len(units) < 10:
        units = [
            TextUnit(i, f'句子{i}内容较长一些便于评分。', '。')
            for i in range(10)
        ]
    plan = plan_rewrite_assignments_for_units(units, 20, 'humorous')
    expected = max(0, min(10, round(10 * compute_cover(20))))
    assert len(plan) == expected
    assert len({a.unit_index for a in plan}) == len(plan)
    assert len(plan) < 10


def test_join_preserves_unselected():
    units = [
        TextUnit(0, '保留句', '。'),
        TextUnit(1, '改写句', '。'),
    ]
    merged = join_text_units(units, {1: '已改写句'})
    assert merged == '保留句。已改写句。'


def test_split_units_basic():
    _leading, units = split_text_units('第一句。第二句！')
    assert len(units) >= 2
    assert units[0].text == '第一句'
    assert units[0].suffix == '。'


def test_paragraph_breaks_preserved():
    body = '第一段第一句。第一句续。\n\n第二段只有一句。'
    leading, units = split_text_units(body)
    merged = join_text_units(units, {}, leading=leading)
    assert merged == body
    assert any('\n\n' in u.suffix for u in units)


def test_leading_newlines_preserved():
    body = '\n\n开头段。'
    leading, units = split_text_units(body)
    merged = join_text_units(units, {}, leading=leading)
    assert merged == body


def test_normalize_strips_duplicate_period():
    from app.services.style_rewrite_service import _normalize_replacement_text

    u = TextUnit(0, '原句', '。\n\n')
    assert _normalize_replacement_text(u, '改写句。') == '改写句'


def test_tier_quotas_sum_to_total_pick():
    units = [TextUnit(i, f'句{i}内容足够长。', '。') for i in range(20)]
    plan = plan_rewrite_assignments_for_units(units, 20, 'professional')
    cover = compute_cover(20)
    expected = max(0, min(20, round(20 * cover)))
    assert len(plan) == expected


def test_accept_replacement_rejects_huge():
    from app.services.style_rewrite_service import _accept_replacement

    unit = TextUnit(0, '这是一句原话。', '。')
    huge = '这是一句被拉得很长的改写' * 5
    assert _accept_replacement(unit, huge) == unit.text


def test_accept_replacement_rejects_heavy_edit_at_low_intensity():
    from app.services.style_rewrite_service import _accept_replacement

    unit = TextUnit(0, '我们应当在数字化转型中保持战略定力。', '。')
    heavy = '你得在数字化浪潮里稳住阵脚别瞎折腾。'
    assert _accept_replacement(unit, heavy, intensity_pct=18) == unit.text
