"""大纲路由 - 使用 @with_llm 装饰器 + Model 层"""
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

from flask import Blueprint, request, jsonify
from ..models import Outline
from ..services.llm_service import get_llm_service
from ..services.hotnews_service import HotNewsService
from ..utils import parse_json_from_llm, translate_error, extract_llm_config
from ..utils_outline import MAX_OUTLINE_H2_SECTIONS, count_top_level_outline_nodes

bp = Blueprint('outline', __name__)
logger = logging.getLogger(__name__)

OUTLINE_SEARCH_TIMEOUT = 5  # 搜索超时缩短，没 Key 时直接跳过


@bp.route('', methods=['GET'])
def get_outline():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    outline = Outline.get_by_project(project_id)
    return jsonify(outline or {})


@bp.route('', methods=['POST'])
def create_or_update_outline():
    data = request.json
    if not data or 'project_id' not in data:
        return jsonify({'error': 'project_id is required'}), 400

    project_id = data['project_id']
    title = data.get('title', '文章大纲')
    nodes = data.get('nodes', [])
    if count_top_level_outline_nodes(nodes) > MAX_OUTLINE_H2_SECTIONS:
        return jsonify({
            'error': f'二级章节（顶层节点）不能超过 {MAX_OUTLINE_H2_SECTIONS} 个',
        }), 400

    outline = Outline.create_or_update(project_id, {
        'title': title,
        'nodes': nodes,
    })

    return jsonify(outline)


@bp.route('/generate', methods=['POST'])
def generate_outline():
    data = request.json
    if not data or 'topic' not in data:
        return jsonify({'error': '请输入文章主题'}), 400

    topic = data['topic']
    target_word_count = min(data.get('target_word_count', 2000), 50000)
    style = data.get('style', 'general')
    tavily_api_key = data.get('tavilyApiKey') or data.get('tavily_api_key')

    llm_cfg = extract_llm_config(data)
    api_key = llm_cfg['api_key']

    if not api_key:
        return jsonify({'error': '请先配置 LLM API Key'}), 400

    try:
        search_context = ''
        search_results: list = []
        # 只有配置了 Tavily Key 才做联网搜索，否则跳过（避免 Google/DDG 超时拖慢生成）
        if tavily_api_key:
            try:
                with ThreadPoolExecutor(max_workers=1) as pool:
                    fut = pool.submit(
                        HotNewsService.search_with_fallback,
                        topic,
                        tavily_api_key,
                        6,
                    )
                    search_results = fut.result(timeout=OUTLINE_SEARCH_TIMEOUT)
            except FuturesTimeout:
                logger.warning('Outline search timed out for topic: %s', topic)
            except Exception as e:
                logger.warning('Outline search failed: %s', e)

        if search_results:
            snippets = []
            for r in search_results[:8]:
                title = r.get('title', '')
                content = r.get('content', '')
                source = r.get('source', '')
                if title or content:
                    snippets.append(f"- [{source}] {title}：{content[:200]}")
            if snippets:
                search_context = '\n\n以下是关于该主题的联网搜索资料：\n' + '\n'.join(snippets)

        llm = get_llm_service(
            provider='custom',
            model_name=llm_cfg['model_name'],
            api_key=llm_cfg['api_key'],
            base_url=llm_cfg['base_url'],
            temperature=llm_cfg['temperature'],
        )

        style_desc = {
            'general': '通用正式风格',
            'wechat': '公众号轻松风格',
            'video': '视频脚本口语化风格',
            'academic': '学术论文风格'
        }.get(style, '通用正式风格')

        prompt = f"""请为以下主题生成一个结构清晰的文章大纲：

主题：{topic}
目标字数：约{target_word_count}字
风格要求：{style_desc}
{search_context}

请生成包含以下要素的大纲：
1. 吸引人的主标题
2. 3-12 个二级章节（顶层 nodes，总数不得超过 {MAX_OUTLINE_H2_SECTIONS} 个）
3. 每个章节下 2-4 个子要点（放 children，成稿用段落/列表展开，不要用 Markdown 标题）；每个要点说明不超过 80 字
4. 简短开头与结尾；全书大纲说明性文字合计不超过 800 字（要点不是正文）

请以JSON格式返回：
{{
    "title": "文章主标题",
    "nodes": [
        {{
            "id": 1,
            "title": "一级章节标题",
            "type": "section",
            "children": [
                {{
                    "id": 11,
                    "title": "二级要点",
                    "content": "要点简要说明"
                }}
            ]
        }}
    ]
}}"""

        result = llm.chat([
            {'role': 'system', 'content': '你是一位专业的文章结构设计师，擅长构建逻辑清晰的文章大纲。请基于提供的搜索资料生成大纲，确保内容真实可靠。'},
            {'role': 'user', 'content': prompt}
        ])

        outline_data = parse_json_from_llm(result)
        nodes_out = outline_data.get('nodes') or []
        if len(nodes_out) > MAX_OUTLINE_H2_SECTIONS:
            outline_data['nodes'] = nodes_out[:MAX_OUTLINE_H2_SECTIONS]
        return jsonify(outline_data)

    except Exception as e:
        return jsonify({'error': translate_error(e)}), 500


@bp.route('/templates', methods=['GET'])
def get_templates():
    templates = [
        {
            'id': 'problem-solution',
            'name': '问题-解决方案',
            'description': '提出问题，分析原因，给出解决方案',
            'structure': [
                {'id': 1, 'title': '问题背景', 'type': 'section'},
                {'id': 2, 'title': '问题分析', 'type': 'section'},
                {'id': 3, 'title': '解决方案', 'type': 'section'},
                {'id': 4, 'title': '实施建议', 'type': 'section'},
                {'id': 5, 'title': '总结展望', 'type': 'section'}
            ]
        },
        {
            'id': 'storytelling',
            'name': '故事叙述',
            'description': '以故事线串联内容，情感共鸣',
            'structure': [
                {'id': 1, 'title': '引子', 'type': 'section'},
                {'id': 2, 'title': '冲突', 'type': 'section'},
                {'id': 3, 'title': '转折', 'type': 'section'},
                {'id': 4, 'title': '高潮', 'type': 'section'},
                {'id': 5, 'title': '结局', 'type': 'section'}
            ]
        },
        {
            'id': 'how-to',
            'name': '教程指南',
            'description': '步骤清晰，实用性强',
            'structure': [
                {'id': 1, 'title': '为什么要学', 'type': 'section'},
                {'id': 2, 'title': '必备条件', 'type': 'section'},
                {'id': 3, 'title': '步骤详解', 'type': 'section'},
                {'id': 4, 'title': '常见问题', 'type': 'section'},
                {'id': 5, 'title': '进阶技巧', 'type': 'section'}
            ]
        },
        {
            'id': 'listicle',
            'name': '清单体',
            'description': '要点清晰，易于阅读',
            'structure': [
                {'id': 1, 'title': '开篇引入', 'type': 'section'},
                {'id': 2, 'title': '要点一', 'type': 'section'},
                {'id': 3, 'title': '要点二', 'type': 'section'},
                {'id': 4, 'title': '要点三', 'type': 'section'},
                {'id': 5, 'title': '总结', 'type': 'section'}
            ]
        }
    ]

    return jsonify(templates)
