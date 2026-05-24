"""写作路由 - 使用 @with_llm 装饰器 + 配置外部化"""
from flask import Blueprint, request, jsonify
from ..decorators import with_llm
from ..config_loader import get_writing_modes, get_anti_ai_rules
from ..utils import parse_json_from_llm, translate_error, extract_llm_config, get_field
from ..services.llm_service import get_llm_service
from ..services.anti_ai_service import scan_content, apply_rule_fixes
from ..services.style_context import merge_writing_context, enrich_writing_context_from_project, get_style_prompt
from ..models import VersionHistory, Outline, ProjectContent
from ..utils_outline import flatten_outline_nodes, outline_nodes_to_markdown, verify_draft_covers_outline
from ..services.derive_service import derive_variants
from ..services.humanize_service import humanize_content
from ..services.draft_version_service import (
    snapshot_draft,
    list_draft_versions,
    get_draft_version,
    restore_draft_version,
    DRAFT_STEP,
)
import json

bp = Blueprint('writing', __name__)


@bp.route('/modes', methods=['GET'])
def get_writing_modes_api():
    modes = get_writing_modes()
    return jsonify({'modes': list(modes.values())})


@bp.route('/anti-ai-rules', methods=['GET'])
def get_anti_ai_rules_api():
    return jsonify(get_anti_ai_rules())


@bp.route('/scan-ai-rules', methods=['POST'])
def scan_ai_rules():
    data = request.json or {}
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    return jsonify(scan_content(data['content']))


@bp.route('/fix-ai-rules', methods=['POST'])
def fix_ai_rules():
    data = request.json or {}
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    result = apply_rule_fixes(data['content'])
    if get_field(data, 'use_llm_polish'):
        try:
            cfg = extract_llm_config(data)
            llm = get_llm_service(
                provider='custom',
                model_name=cfg['model_name'],
                api_key=cfg['api_key'],
                base_url=cfg['base_url'],
                temperature=cfg['temperature'],
            )
            style_prompt = get_style_prompt(get_field(data, 'style_profile_id'))
            polished = llm.apply_anti_ai_polish(result['fixed_content'], style_prompt)
            result['fixed_content'] = polished
            after = scan_content(polished)
            result['after_score'] = after['score']
            result['improved'] = after['score'] < result['before_score']
        except Exception as e:
            return jsonify({'error': translate_error(e)}), 500
    return jsonify(result)


@bp.route('/select-mode', methods=['POST'])
@with_llm(require_content=False, content_key='brief')
def select_writing_mode(llm, data):
    brief = data.get('brief', '')
    specification = data.get('specification', '')
    if not brief:
        return jsonify({'error': 'brief is required'}), 400
    return llm.select_writing_mode(brief, specification)


@bp.route('/coach-guide', methods=['POST'])
@with_llm(require_content=False)
def coach_mode_guide(llm, data):
    section_info = get_field(data, 'section_info', 'sectionInfo')
    if not section_info:
        return jsonify({'error': 'section_info is required'}), 400
    style_prompt = get_style_prompt(get_field(data, 'style_profile_id', 'styleProfileId'))
    section_info = dict(section_info)
    if style_prompt:
        section_info['styleGuide'] = style_prompt
    result = llm.coach_mode_guide(section_info)
    return {'guide': result}


@bp.route('/coach-check', methods=['POST'])
@with_llm
def coach_mode_check(llm, data):
    section_info = get_field(data, 'section_info', 'sectionInfo')
    if not section_info:
        return jsonify({'error': 'section_info is required'}), 400
    scan = scan_content(data['content'])
    result = llm.coach_mode_check(data['content'], section_info)
    return {'feedback': result, 'rule_scan': scan}


@bp.route('/framework-generate', methods=['POST'])
@with_llm(require_content=False)
def framework_mode_generate(llm, data):
    project_id = data.get('project_id') or data.get('projectId')
    outline = (data.get('outline') or '').strip()
    nodes: list = []
    if project_id:
        o = Outline.get_by_project(project_id)
        nodes = (o.get('nodes') or []) if o else []
        if not outline and nodes:
            outline = outline_nodes_to_markdown(nodes)
            if o.get('title'):
                outline = f"# {o['title']}\n\n{outline}"
    if not outline:
        return jsonify({'error': '请先在「生成大纲」步骤保存大纲'}), 400

    context = merge_writing_context({**data, 'anti_ai_rules': True, 'full_outline': outline})
    if project_id:
        context = enrich_writing_context_from_project(project_id, context)
    result = llm.framework_mode_generate(outline, context)
    fixed = apply_rule_fixes(result)
    flat = flatten_outline_nodes(nodes) if nodes else []
    missing = verify_draft_covers_outline(fixed['fixed_content'], flat) if flat else []
    return {
        'content': fixed['fixed_content'],
        'missing_sections': missing,
        'outline_following': len(missing) == 0,
    }


def _post_process_text(text: str, llm=None, style_prompt: str = '') -> str:
    """规则去 AI 味；有风格画像时再走 LLM 润色去味"""
    text = apply_rule_fixes(text)['fixed_content']
    if llm and style_prompt:
        text = llm.apply_anti_ai_polish(text, style_prompt)
    return text


@bp.route('/continue', methods=['POST'])
@with_llm
def continue_writing(llm, data):
    context = merge_writing_context({**data, 'anti_ai_rules': True})
    text = llm.continue_writing(data['content'], context)
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    return {'continuation': _post_process_text(text, llm, style_prompt)}


@bp.route('/polish', methods=['POST'])
@with_llm
def polish_content(llm, data):
    style = data.get('style', 'professional')
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    text = llm.polish_content(data['content'], style)
    return {'polished_content': _post_process_text(text, llm, style_prompt)}


@bp.route('/rewrite', methods=['POST'])
@with_llm
def rewrite_content(llm, data):
    if 'style' not in data:
        return jsonify({'error': 'style is required'}), 400
    style = data['style']
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    result = llm.rewrite_content(data['content'], style)
    return {'rewritten_content': _post_process_text(result, llm, style_prompt)}


@bp.route('/expand', methods=['POST'])
@with_llm
def expand_content(llm, data):
    target_length = min(data.get('target_length', 500), 10000)
    ctx = merge_writing_context(data)
    style_note = ctx.get('style', '')
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    result = llm.chat([
        {'role': 'system', 'content': '你是一位专业的内容扩展专家，善于丰富文章内容。'},
        {'role': 'user', 'content': f'请扩展以下内容，目标字数约{target_length}字：\n\n原文：\n{data["content"]}\n\n风格：{style_note}\n\n要求：\n1. 保持原意不变\n2. 增加细节、例子或解释\n3. 保持逻辑连贯\n4. 不要重复内容\n5. 避免AI套话\n\n请直接输出扩展后的内容。'}
    ])
    return {'expanded_content': _post_process_text(result, llm, style_prompt)}


@bp.route('/shorten', methods=['POST'])
@with_llm
def shorten_content(llm, data):
    content = data['content']
    source_count = get_field(data, 'source_word_count', 'sourceWordCount')
    target_count = get_field(data, 'target_word_count', 'targetWordCount')

    if target_count is not None:
        target = max(50, int(target_count))
    else:
        target_ratio = max(0.1, min(float(get_field(data, 'target_ratio', default=0.5) or 0.5), 1.0))
        approx_source = len(content.replace('\n', '').replace(' ', '')) or 1
        target = max(50, int(approx_source * target_ratio))

    style_prompt = get_style_prompt(get_field(data, 'style_profile_id', 'styleProfileId'))
    style_note = f'\n风格参考：{style_prompt}' if style_prompt else ''
    result = llm.chat([
        {
            'role': 'system',
            'content': '你是一位专业的内容压缩专家，善于在指定字数内保留核心信息。',
        },
        {
            'role': 'user',
            'content': (
                f'请将以下文章压缩到约 {target} 字（允许 ±10%），保留所有关键信息与逻辑顺序，'
                f'删除重复、啰嗦和空泛表达，避免 AI 套话。{style_note}\n\n原文：\n{content}\n\n'
                '请直接输出压缩后的完整正文。'
            ),
        },
    ])
    shortened = _post_process_text(result, llm, style_prompt)
    return {
        'shortened_content': shortened,
        'source_word_count': int(source_count) if source_count is not None else None,
        'target_word_count': target,
    }


@bp.route('/apply-prompt', methods=['POST'])
@with_llm
def apply_writing_prompt(llm, data):
    instruction = get_field(data, 'instruction', 'prompt')
    if not instruction or not str(instruction).strip():
        return jsonify({'error': 'instruction is required'}), 400
    style_prompt = get_style_prompt(get_field(data, 'style_profile_id', 'styleProfileId'))
    result = llm.apply_writing_instruction(
        data['content'],
        str(instruction).strip(),
        style_prompt,
    )
    return {'content': _post_process_text(result, llm, style_prompt)}


@bp.route('/grammar-check', methods=['POST'])
@with_llm
def grammar_check(llm, data):
    return llm.check_grammar(data['content'])


@bp.route('/ai-taste', methods=['POST'])
@with_llm
def analyze_ai_taste(llm, data):
    llm_result = llm.analyze_ai_taste(data['content'])
    rule_scan = scan_content(data['content'])
    parsed = parse_json_from_llm(llm_result) if isinstance(llm_result, str) else llm_result
    if isinstance(parsed, dict):
        parsed['rule_scan'] = rule_scan
        return parsed
    return {'raw_result': llm_result, 'rule_scan': rule_scan}


@bp.route('/generate-title', methods=['POST'])
@with_llm
def generate_title(llm, data):
    count = min(data.get('count', 5), 10)
    platform = data.get('platform', 'general')
    return llm.generate_title(data['content'], count, platform)


@bp.route('/title-workshop', methods=['POST'])
@with_llm(require_content=False, content_key='topic')
def title_workshop(llm, data):
    topic = data.get('topic', '')
    if not topic:
        return jsonify({'error': 'topic is required'}), 400
    count = min(data.get('count', 5), 10)
    platform = data.get('platform', 'general')
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    result = llm.title_workshop(
        topic=topic,
        outline=data.get('outline', ''),
        draft_excerpt=data.get('draft_excerpt', ''),
        count=count,
        platform=platform,
        style_prompt=style_prompt,
    )
    parsed = parse_json_from_llm(result)
    return parsed or {'raw_result': result}


@bp.route('/generate-section', methods=['POST'])
@with_llm(require_content=False, content_key='sectionTitle')
def generate_section(llm, data):
    title = data.get('section_title') or data.get('sectionTitle', '')
    if not title:
        return jsonify({'error': 'section_title is required'}), 400
    section_type = data.get('section_type') or data.get('sectionType', 'info')
    project_id = data.get('project_id') or data.get('projectId')
    ctx = merge_writing_context({**data, 'anti_ai_rules': True})
    ctx['section_brief'] = (
        data.get('section_brief')
        or data.get('sectionBrief')
        or data.get('section_content')
        or data.get('sectionContent')
        or ctx.get('section_brief')
        or ''
    )
    if project_id:
        ctx = enrich_writing_context_from_project(project_id, ctx)
    content = llm.generate_section(title, section_type, ctx)
    fixed = apply_rule_fixes(content)
    return {
        'section_title': title,
        'section_type': section_type,
        'content': fixed['fixed_content'],
        'rule_scan': scan_content(fixed['fixed_content']),
    }


@bp.route('/judge-section', methods=['POST'])
@with_llm
def judge_section(llm, data):
    title = data.get('section_title') or data.get('sectionTitle', '章节')
    result = llm.judge_section(data['content'], title)
    parsed = parse_json_from_llm(result)
    rule_scan = scan_content(data['content'])
    if isinstance(parsed, dict):
        parsed['rule_scan'] = rule_scan
        return parsed
    return {'raw_result': result, 'rule_scan': rule_scan}


@bp.route('/revise-section', methods=['POST'])
@with_llm
def revise_section(llm, data):
    title = data.get('section_title') or data.get('sectionTitle', '章节')
    issues = data.get('issues', [])
    style_prompt = get_style_prompt(data.get('style_profile_id'))
    revised = llm.revise_section(data['content'], title, issues, style_prompt)
    fixed = apply_rule_fixes(revised)

    project_id = data.get('project_id') or data.get('projectId')
    if project_id:
        versions = VersionHistory.get_by_project_step(project_id, 5)
        next_ver = (versions[0]['version_number'] + 1) if versions else 1
        VersionHistory.create(
            project_id=project_id,
            step=5,
            content=data['content'],
            version_number=next_ver,
            note=f'修订前备份: {title}',
        )

    before_scan = scan_content(data['content'])
    after_scan = scan_content(fixed['fixed_content'])
    before_score = data.get('previous_score')
    after_score = after_scan['score']
    degraded = (
        before_score is not None
        and after_score > before_score
        and after_score > before_scan['score']
    )

    return {
        'content': data['content'] if degraded else fixed['fixed_content'],
        'revised': not degraded,
        'degraded': degraded,
        'before_score': before_score or before_scan['score'],
        'after_score': after_score if not degraded else before_scan['score'],
        'rule_scan': after_scan if not degraded else before_scan,
    }


@bp.route('/section-draft', methods=['GET'])
def get_section_draft_state():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    outline = Outline.get_by_project(project_id)
    nodes = outline.get('nodes', []) if outline else []
    return jsonify({
        'sections': flatten_outline_nodes(nodes),
        'outline_title': outline.get('title', '') if outline else '',
    })


@bp.route('/fast-draft', methods=['POST'])
@with_llm(require_content=False, content_key='outline')
def fast_draft_from_outline(llm, data):
    """快速模式：严格按大纲逐节生成并拼接"""
    project_id = data.get('project_id') or data.get('projectId')
    outline_text = data.get('outline', '')
    nodes = data.get('nodes', [])
    if not nodes and project_id:
        o = Outline.get_by_project(project_id)
        nodes = o.get('nodes', []) if o else []
        if o and o.get('title') and not outline_text:
            outline_text = o['title']

    sections = flatten_outline_nodes(nodes)
    if not sections:
        return jsonify({'error': '请先在「生成大纲」步骤创建并保存大纲，再按大纲写稿'}), 400

    outline_md = outline_nodes_to_markdown(nodes) if nodes else outline_text
    ctx_base = merge_writing_context({**data, 'anti_ai_rules': True, 'full_outline': outline_md})
    if project_id:
        ctx_base = enrich_writing_context_from_project(project_id, ctx_base)

    parts: list[str] = []
    prior = ''

    for i, sec in enumerate(sections):
        ctx = {
            **ctx_base,
            'prior_sections': prior,
            'section_brief': sec.get('content', ''),
            'section_index': i + 1,
            'section_total': len(sections),
        }
        block = llm.generate_section(
            sec['title'],
            sec.get('section_type', 'info'),
            ctx,
        )
        fixed = apply_rule_fixes(block)['fixed_content']
        parts.append(fixed)
        prior += '\n\n' + fixed

    full = '\n\n'.join(parts)
    missing = verify_draft_covers_outline(full, sections)
    return {
        'content': full,
        'section_count': len(sections),
        'missing_sections': missing,
        'outline_following': len(missing) == 0,
    }


def _latest_draft(project_id: str) -> str:
    return ProjectContent.get_latest_content(project_id, step=5)


@bp.route('/humanize', methods=['POST'])
@with_llm(require_content=False)
def humanize_pass(llm, data):
    """人味化改写 pass（阶段 3.5）"""
    project_id = data.get('project_id') or data.get('projectId')
    content = (data.get('content') or '').strip()
    if not content and project_id:
        content = _latest_draft(project_id)
    if not content:
        return jsonify({'error': 'content or project_id with draft is required'}), 400
    result = humanize_content(content, llm)
    if project_id and data.get('persist', True):
        ProjectContent.create(
            project_id=project_id,
            step=5,
            content_type='markdown',
            content=result['content'],
        )
    return result


@bp.route('/derive-variants', methods=['POST'])
@with_llm(require_content=False)
def derive_variants_route(llm, data):
    """母稿 → 公众号 / 小红书 / 口播"""
    project_id = data.get('project_id') or data.get('projectId')
    content = (data.get('content') or '').strip()
    if not content and project_id:
        content = _latest_draft(project_id)
    if not content:
        return jsonify({'error': 'content or project_id with draft is required'}), 400

    variants = derive_variants(content, llm)
    if project_id and data.get('persist', True):
        payload = json.dumps({'variants': variants}, ensure_ascii=False, indent=2)
        ProjectContent.create(
            project_id=project_id,
            step=10,
            content_type='json',
            content=payload,
        )

    return {'variants': variants, 'platforms': list(variants.keys())}


@bp.route('/versions', methods=['GET'])
def list_versions():
    project_id = request.args.get('project_id') or request.args.get('projectId')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    step = request.args.get('step', DRAFT_STEP, type=int)
    return jsonify({'versions': list_draft_versions(project_id, step)})


@bp.route('/versions/<version_id>', methods=['GET'])
def get_version(version_id):
    version = get_draft_version(version_id)
    if not version:
        return jsonify({'error': 'version not found'}), 404
    return jsonify(version)


@bp.route('/versions/snapshot', methods=['POST'])
def create_version_snapshot():
    data = request.json or {}
    project_id = data.get('project_id') or data.get('projectId')
    content = data.get('content', '')
    note = data.get('note') or '保存前快照'
    step = data.get('step', DRAFT_STEP)
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    if not (content or '').strip():
        return jsonify({'error': 'content is required'}), 400
    version = snapshot_draft(project_id, content, note=note, step=step)
    if not version:
        return jsonify({'skipped': True, 'reason': 'unchanged'})
    return jsonify(version), 201


@bp.route('/versions/restore', methods=['POST'])
def restore_version():
    data = request.json or {}
    project_id = data.get('project_id') or data.get('projectId')
    version_id = data.get('version_id') or data.get('versionId')
    if not project_id or not version_id:
        return jsonify({'error': 'project_id and version_id are required'}), 400
    try:
        result = restore_draft_version(
            project_id,
            version_id,
            current_content=data.get('current_content') or data.get('currentContent') or '',
        )
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 404
    return jsonify(result)
