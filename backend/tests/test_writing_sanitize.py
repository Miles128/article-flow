from app.utils_writing_sanitize import polish_generated_draft, strip_writing_meta_leakage


def test_strip_word_count_meta_lines():
    raw = '''**引言**

全文约2000字，共分五节。

这是正文。'''
    out = strip_writing_meta_leakage(raw)
    assert '2000字' not in out
    assert '这是正文' in out


def test_strip_section_index_meta():
    raw = '第 2/5 节\n\n正文内容。'
    out = strip_writing_meta_leakage(raw)
    assert '2/5' not in out
    assert '正文内容' in out


def test_polish_generated_draft_flattens_h3_and_meta():
    raw = '''### 小节

全文约 3000 字。

正文。'''
    out = polish_generated_draft(raw)
    assert '### ' not in out
    assert '**小节**' in out
    assert '3000' not in out
    assert '正文' in out
