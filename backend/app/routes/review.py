"""审校路由 - 使用配置外部化 + @with_llm 装饰器"""
from flask import Blueprint, request, jsonify
from ..decorators import with_llm
from ..config_loader import get_review_passes, get_ai_cliche_db, get_audit_flows
from ..services.anti_ai_service import scan_content
from ..services.content_eval_service import eval_article_rules, run_critic
from ..models import Comment
from ..utils import parse_json_from_llm, get_field
from datetime import datetime, timezone

bp = Blueprint('review', __name__)


@bp.route('/review-passes', methods=['GET'])
def get_review_passes_api():
    passes = get_review_passes()
    ai_cliche_db = get_ai_cliche_db()
    return jsonify({'passes': list(passes.values()), 'ai_cliche_db': ai_cliche_db})


@bp.route('/review-pass', methods=['POST'])
@with_llm(require_content=False)
def run_review_pass(llm, data):
    pass_type = get_field(data, 'pass_type', 'passType')
    if 'content' not in data or not pass_type:
        return jsonify({'error': 'content and pass_type are required'}), 400

    passes = get_review_passes()
    if pass_type not in passes:
        return jsonify({'error': f'Invalid pass type: {pass_type}. Must be one of: {", ".join(passes.keys())}'}), 400

    context = data.get('context', {})
    result = llm.three_pass_review(pass_type, data['content'], context)
    parsed = parse_json_from_llm(result)
    if isinstance(parsed, dict) and pass_type == 'style' and parsed.get('ai_taste_score') is not None:
        parsed.setdefault('score', parsed['ai_taste_score'])
    return {'passType': pass_type, **(parsed or {'raw_result': result})}


@bp.route('/review-all', methods=['POST'])
@with_llm(require_content=False)
def run_review_all(llm, data):
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400

    results = {}
    passes = get_review_passes()
    for pass_type in passes:
        result = llm.three_pass_review(pass_type, data['content'])
        results[pass_type] = parse_json_from_llm(result) or {'raw_result': result}

    return {'results': results}


@bp.route('/review-pipeline', methods=['POST'])
@with_llm(require_content=False)
def run_review_pipeline(llm, data):
    """三轮审校一键流水线 + Markdown 报告"""
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400

    content = data['content']
    rule_scan = scan_content(content)
    eval_result = eval_article_rules(content, data.get('title', ''))
    critic_result = run_critic(
        llm,
        content,
        topic=data.get('topic', ''),
        platform=data.get('platform', 'wechat'),
        context=str(data.get('context', '')),
    )
    passes = get_review_passes()
    ordered = sorted(passes.values(), key=lambda p: p.get('order', 0))
    results: dict = {}
    report_lines = [
        '# 审校流水线报告',
        '',
        '## 规则扫描（去AI味）',
        f'- 评分: {rule_scan["score"]}/100（目标 < {rule_scan["target_score"]}）',
        f'- 命中: {rule_scan["match_count"]} 处',
        f'- 通过: {"是" if rule_scan["passed"] else "否"}',
        f'- 门禁: {rule_scan.get("gate_status", "unknown")}',
        '',
        '## 量表评估',
        f'- 总分: {eval_result.get("total_score", 0)}/100',
        f'- AI味档位: {eval_result.get("ai_flavor_band", "")}',
        '',
        '## Critic 五维',
        f'- 评分: {critic_result.get("score", "N/A")}/10',
        f'- 建议: {critic_result.get("feedback", "")}',
        '',
    ]

    for p in ordered:
        pid = p['id']
        raw = llm.three_pass_review(pid, content, data.get('context', {}))
        parsed = parse_json_from_llm(raw) or {'raw_result': raw}
        results[pid] = parsed
        score = parsed.get('score') or parsed.get('ai_taste_score', 'N/A')
        issue_count = len(parsed.get('issues', []))
        report_lines.append(f'## 第{p.get("order")}遍：{p.get("name")}')
        report_lines.append(f'- 评分: {score}')
        report_lines.append(f'- 问题数: {issue_count}')
        if parsed.get('overall'):
            report_lines.append(f'- 总评: {parsed["overall"]}')
        report_lines.append('')

    ai_taste = llm.analyze_ai_taste(content)
    ai_parsed = parse_json_from_llm(ai_taste) if isinstance(ai_taste, str) else ai_taste
    if isinstance(ai_parsed, dict):
        results['ai_taste'] = ai_parsed
        report_lines.append('## AI 味检测')
        report_lines.append(f'- 综合分: {ai_parsed.get("score", "N/A")}')
        report_lines.append('')

    return {
        'results': results,
        'rule_scan': rule_scan,
        'eval': eval_result,
        'critic': critic_result,
        'report_markdown': '\n'.join(report_lines),
        'passed': rule_scan['passed'] and eval_result.get('passed', False) and critic_result.get('passed', False),
    }


@bp.route('/authenticity', methods=['POST'])
@with_llm(require_content=False)
def check_authenticity(llm, data):
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    return llm.authenticity_check(data['content'])


@bp.route('/workspace-check', methods=['POST'])
@with_llm(require_content=False)
def check_workspace_constraints(llm, data):
    if 'content' not in data or 'workspace' not in data:
        return jsonify({'error': 'content and workspace are required'}), 400

    workspace = data['workspace']
    valid_workspaces = ['wechat', 'video', 'general']
    if workspace not in valid_workspaces:
        return jsonify({'error': f'workspace must be one of: {", ".join(valid_workspaces)}'}), 400

    return llm.workspace_constraint_check(data['content'], workspace)


@bp.route('/comments', methods=['GET'])
def get_comments():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    comments = Comment.get_by_project(project_id)
    return jsonify(comments)


@bp.route('/comments', methods=['POST'])
def create_comment():
    data = request.json
    if not data or 'project_id' not in data or 'content' not in data:
        return jsonify({'error': 'project_id and content are required'}), 400

    comment = Comment.create(
        project_id=data['project_id'],
        content=data['content'],
        author=data.get('author', '匿名'),
        step=data.get('step'),
        position=data.get('position'),
        selection=data.get('selection'),
    )
    return jsonify(comment), 201


@bp.route('/comments/<comment_id>', methods=['PUT'])
def update_comment(comment_id):
    data = request.json

    if 'reply' in data:
        # 添加回复（通过 Model 层操作，保证封装性）
        result = Comment.add_reply(
            comment_id=comment_id,
            content=data['reply'],
            author=data.get('author', '匿名')
        )
        if result:
            return jsonify(result)
        return jsonify({'error': 'Comment not found'}), 404

    # 更新评论属性
    update_data = {}
    if 'content' in data:
        update_data['content'] = data['content']
    if 'resolved' in data:
        update_data['resolved'] = data['resolved']
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    if update_data:
        Comment.update(comment_id, update_data)

    comment = Comment.get_by_id(comment_id)
    if comment:
        return jsonify(comment)
    return jsonify({'error': 'Comment not found'}), 404


@bp.route('/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    if Comment.delete(comment_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Comment not found'}), 404


@bp.route('/compliance', methods=['POST'])
@with_llm(require_content=False)
def check_compliance(llm, data):
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    return llm.check_compliance(data['content'])


@bp.route('/logic-check', methods=['POST'])
@with_llm(require_content=False)
def check_logic(llm, data):
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400

    result = llm.chat([
        {'role': 'system', 'content': '你是一位逻辑分析专家，擅长发现文章中的逻辑问题。'},
        {'role': 'user', 'content': f'请分析以下文章的逻辑一致性，检查是否存在：\n1. 前后矛盾\n2. 逻辑漏洞\n3. 论证不充分\n4. 结构混乱\n\n文章内容：\n{data["content"]}\n\n请以JSON格式返回：\n{{"is_logical": true/false, "issues": [{{"type": "问题类型", "position": "位置描述", "description": "问题描述", "suggestion": "改进建议"}}], "overall_assessment": "整体评估", "suggestions": ["改进建议1", "改进建议2"]}}'}
    ])
    return result


@bp.route('/audit-flow', methods=['GET'])
def get_audit_flow():
    flows = get_audit_flows()
    return jsonify(flows)


@bp.route('/audit', methods=['POST'])
@with_llm(require_content=False)
def run_audit(llm, data):
    if 'content' not in data or 'flow_id' not in data:
        return jsonify({'error': 'content and flow_id are required'}), 400

    content = data['content']
    flow_id = data['flow_id']

    results = {}

    if flow_id in ['standard', 'strict']:
        results['grammar'] = llm.check_grammar(content)

    if flow_id == 'strict':
        results['logic'] = llm.chat([
            {'role': 'system', 'content': '你是一位逻辑分析专家。'},
            {'role': 'user', 'content': f'请快速分析以下文章的逻辑一致性：\n\n{content[:1500]}\n\n请简要回答：是否存在明显的逻辑问题？如果有，请列出主要问题。'}
        ])
        results['compliance'] = llm.check_compliance(content)
        results['ai_taste'] = llm.analyze_ai_taste(content)

    return {
        'flow_id': flow_id,
        'results': results,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
