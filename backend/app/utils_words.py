"""中英文字数统计（与前端 countArticleWords 一致）"""
from __future__ import annotations

import re


def count_article_words(text: str) -> int:
    trimmed = (text or '').strip()
    if not trimmed:
        return 0
    cjk = len(re.findall(r'[\u4e00-\u9fff]', trimmed))
    latin_only = re.sub(r'[\u4e00-\u9fff]', ' ', trimmed)
    latin_words = [w for w in latin_only.split() if re.search(r'[a-zA-Z0-9]', w)]
    return cjk + len(latin_words)
