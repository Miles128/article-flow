"""成稿质量与事实约束（按大纲写稿 / 分节写作共用）"""
from __future__ import annotations

from datetime import datetime

from ..config_loader import get_writing_rhythm_limits


def writing_year() -> int:
    return datetime.now().year


def get_factual_writing_rules() -> str:
    y = writing_year()
    return (
        f'【事实与案例（{y} 年，硬性）】\n'
        '1. 禁止编造：具体机构名、人名、报告名、统计数据、判决/新闻细节\n'
        '2. 案例与数据只能来自「参考资料」或「本节大纲要点」已写明内容；'
        '无来源则用概括表述（如「有高校曾…」「部分平台…」），不得虚构「某校2020年…」\n'
        f'3. 禁止把 {y - 2} 年及更早的具体年份写成「新近案例」；'
        f'若无 {y - 1}/{y} 年来源，不写具体年份，或明确写「据较早公开报道（20XX年）」\n'
        '4. 禁止输出写作元信息：不得在正文出现「全文/本文/共/约/目标/字数/第几节/将分为」等篇幅或结构说明\n'
        '5. 禁止 ##、### 标题行；子结构用段落或列表'
    )


def get_depth_writing_rules() -> str:
    return (
        '【论证深度（硬性，优先于凑字数）】\n'
        '1. 每节围绕一个中心论点：先亮明判断，再解释原因/机制，再落到影响或对策\n'
        '2. 大纲子要点之间用因果、转折、递进串联，禁止并列堆砌小标题或空话\n'
        '3. 允许用 1～2 句承接上一节结论，但禁止复制前文段落\n'
        '4. 避免「首先其次再次」「综上所述」等模板化结构\n'
        '5. 宁可信息密度高、句子扎实，也不要用标题行把文章切成碎片'
    )


def get_rhythm_writing_rules() -> str:
    lim = get_writing_rhythm_limits()
    max_sent = lim['max_sentence_chars']
    max_para = lim['max_paragraph_chars']
    max_n = lim['max_sentences_per_paragraph']
    return (
        '【节奏与可读性（硬性）】\n'
        f'1. 单句尽量不超过 {max_sent} 字；超过则拆成两句，避免从句套从句\n'
        f'2. 单段不超过 {max_para} 字、不超过 {max_n} 句；信息多时用列表或分段，禁止「墙式」长段\n'
        '3. 一段只推进一个意思；新论点、新案例必须起新段\n'
        '4. 多用短句与句号断句，少用顿号/分号串联一长串'
    )


def get_writing_quality_rules() -> str:
    return '\n'.join([
        get_factual_writing_rules(),
        get_depth_writing_rules(),
        get_rhythm_writing_rules(),
    ])


def get_section_length_instruction(target_words: int, max_words: int) -> str:
    return (
        f'【篇幅-仅内部约束，勿写入正文】本节成稿约 {target_words} 字，上限 {max_words} 字。'
        '正文中禁止出现字数、节次、写作计划等元信息。'
    )
