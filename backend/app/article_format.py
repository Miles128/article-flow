"""文章 Markdown 排版约定（写作 / 润色共用）"""
from .utils_markdown import split_markdown_title


def get_article_format_prompt() -> str:
    return (
        '【Markdown 排版（必须遵守）】\n'
        '1. 全文仅一个 # 文章主标题（50字内）\n'
        '2. 禁止 ##、###、#### 等一切层级标题行；大纲章节用 **章节标题**（与大纲逐字一致）'
        '单独一行点题，正文用自然段衔接\n'
        '3. 大纲子要点只用段落或 - 列表展开，不得再设小标题行\n'
        '4. 关键术语、结论用 **加粗**；段落之间空一行\n'
        '5. 禁止输出写作说明、字数、节次等元信息\n'
        '6. 短句、短段：单段不超过约 3 句，避免长句堆砌'
    )


def section_opening_rule(title: str) -> str:
    return (
        f'开篇用 **{title}** 点题（与大纲逐字一致）；禁止 ## / ### 行；'
        '子结构用段落或列表，不用小标题。'
    )


def ensure_article_title(content: str, title: str) -> str:
    """若正文尚无 # 主标题，用大纲标题补一行。"""
    text = (content or '').strip()
    outline_title = (title or '').strip()
    if not text or not outline_title:
        return text
    title_block, _ = split_markdown_title(text)
    if title_block.strip():
        return text
    merged = f'# {outline_title}\n\n{text}'
    from .utils_outline import flatten_section_headings

    return flatten_section_headings(merged)
