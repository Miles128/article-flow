"""成稿质量与事实约束（按大纲写稿 / 分节写作共用）"""
from __future__ import annotations

from datetime import datetime

from ..config_loader import get_writing_rhythm_limits
from .writing_intent import normalize_writing_intent


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
        '5. 禁止 ##、### 等一切层级标题行（含无空格 ##标题）；大纲章节仅用 **章节名** 单独一行点题，子结构用段落或列表'
    )


def get_readability_writing_rules() -> str:
    return (
        '【通顺可读（硬性，优先于风格装饰）】\n'
        '1. 每句语法完整、主谓宾清晰；禁止为凑短句而碎裂、省略主语或留下半截话\n'
        '2. 段内与节间衔接自然，可用过渡句；禁止前后矛盾或话题硬跳\n'
        '3. 禁止堆砌写作说明或自我解释；洞察与事实要求不得为「通顺」而删掉'
    )


def get_paragraph_substance_rules() -> str:
    return (
        '【段落信息密度（硬性）】\n'
        '1. 每一段须至少具备下列之一，否则删改或并入他段：'
        '新信息（此前未出现的事实、数据、论点或因果）、'
        '新视角（不同于上文的判断、转折、归因或追问）、'
        '画面感（可感知的场景、动作、细节，非抽象空话）\n'
        '2. 禁止整段仅复述上文、仅过渡、仅喊口号；承上启下句须与当段新内容同段出现\n'
        '3. 一节内多段时，每段都要推进论述或叙事，不得「灌水段」'
    )


def get_depth_writing_rules() -> str:
    return (
        '【论证（信息科普）】\n'
        '1. 每节一个中心论点，因果或递进展开，避免空话堆砌\n'
        '2. 可用 1～2 句承接上文，勿整段复制前文\n'
        '3. 少用「首先其次再次」「综上所述」套话'
    )


def get_insight_writing_rules() -> str:
    return (
        '【洞察与思想（观点评论，硬性）】\n'
        '1. 全文须服务于写前 Brief 中的中心论断；每节至少一句带判断的句子（非复述资料）\n'
        '2. 证据 → 推论 → 结论：引用资料后必须写出「因此/这意味着/问题在于」类推论\n'
        '3. 允许克制书面语与适度长句；禁止为去 AI 而改成口水口语或清单体\n'
        '4. 禁止空泛升华（「值得关注」「具有重要意义」「不容忽视」）\n'
        '5. 若 Brief 给出「本节须回答问题」，本节开头或中段必须正面回应'
    )


def get_literary_writing_rules() -> str:
    return (
        '【叙事随笔】\n'
        '1. 保留具体场景与细节；允许适度比喻、节奏变化，禁止堆砌空灵套话\n'
        '2. 须有可复述的作者视角或判断，不能只有描写无观点\n'
        '3. 禁止为「幽默/口语」牺牲信息与逻辑'
    )


def get_rhythm_writing_rules(*, writing_intent: str = 'informational') -> str:
    lim = get_writing_rhythm_limits()
    max_sent = lim['max_sentence_chars']
    max_para = lim['max_paragraph_chars']
    if writing_intent in ('insight_commentary', 'literary_essay'):
        return (
            '【节奏】\n'
            '1. 长短句交替，关键判断句可略长但须完整\n'
            f'2. 单段不宜超过 {max_para} 字；勿为压短句数而拆碎论证\n'
            '3. 禁止连续五句以上同等长度的短句'
        )
    return (
        '【节奏建议（勿为达标而拆碎句子）】\n'
        f'1. 一般句子控制在 {max_sent} 字以内，过长再拆，保持可读\n'
        f'2. 单段不宜超过 {max_para} 字；信息多时分段或列表\n'
        '3. 长短句交替，避免连续极短句造成卡顿感'
    )


def get_writing_quality_rules(
    writing_intent: str | None = None,
    *,
    writing_brief_block: str = '',
) -> str:
    intent = normalize_writing_intent(writing_intent)
    depth = {
        'informational': get_depth_writing_rules(),
        'insight_commentary': get_insight_writing_rules(),
        'literary_essay': get_literary_writing_rules(),
    }.get(intent, get_depth_writing_rules())
    parts = [
        get_readability_writing_rules(),
        get_paragraph_substance_rules(),
        get_factual_writing_rules(),
        depth,
        get_rhythm_writing_rules(writing_intent=intent),
    ]
    brief = (writing_brief_block or '').strip()
    if brief:
        parts.append(brief)
    return '\n\n'.join(parts)


def get_section_writing_rules(
    writing_intent: str | None = None,
    *,
    writing_brief_block: str = '',
) -> str:
    return get_writing_quality_rules(
        writing_intent,
        writing_brief_block=writing_brief_block,
    )


def get_section_length_instruction(target_words: int, max_words: int) -> str:
    return (
        f'【篇幅-仅内部约束，勿写入正文】本节成稿约 {target_words} 字，上限 {max_words} 字。'
        '正文中禁止出现字数、节次、写作计划等元信息。'
    )
