"""格式转换路由 - 使用配置外部化 + @with_llm 装饰器"""
from flask import Blueprint, request, jsonify
from ..decorators import with_llm
from ..config_loader import get_platforms
from ..utils import translate_error
import re

bp = Blueprint('format', __name__)


@bp.route('/inline-css', methods=['POST'])
def inline_css():
    data = request.json
    if not data or 'html' not in data or 'css' not in data:
        return jsonify({'error': 'html and css are required'}), 400

    try:
        from premailer import transform
        full_html = f"""<!DOCTYPE html>
<html><head><style>{data['css']}</style></head>
<body>{data['html']}</body></html>"""

        inlined = transform(full_html, remove_classes=False, strip_important=True)

        body_match = re.search(r'<body>(.*?)</body>', inlined, re.DOTALL)
        result = body_match.group(1) if body_match else inlined

        return jsonify({'inlined_html': result})
    except Exception as e:
        return jsonify({'error': translate_error(e)}), 500


@bp.route('/normalize', methods=['POST'])
@with_llm(require_content=False)
def normalize_markdown(llm, data):
    if 'content' not in data:
        return jsonify({'error': 'content is required'}), 400

    result = llm.chat([
        {'role': 'system', 'content': '你是一位Markdown格式专家，擅长统一文档格式。'},
        {'role': 'user', 'content': f'请将以下Markdown内容规范化，确保格式统一：\n\n{data["content"]}\n\n规范化要求：\n1. 标题层级统一\n2. 列表格式统一\n3. 引用格式统一\n4. 代码块格式统一\n5. 空行统一\n\n请直接输出规范化后的Markdown内容。'}
    ])
    return {'normalized_content': result}


@bp.route('/convert', methods=['POST'])
@with_llm(require_content=False)
def convert_format(llm, data):
    if 'content' not in data or 'target_platform' not in data:
        return jsonify({'error': 'content and target_platform are required'}), 400

    converted = llm.convert_format(data['content'], data['target_platform'])
    return {'target_platform': data['target_platform'], 'converted_content': converted}


@bp.route('/platforms', methods=['GET'])
def get_platforms_api():
    platforms = get_platforms()
    return jsonify(platforms)


@bp.route('/export', methods=['POST'])
def export_content():
    data = request.json
    if not data or 'content' not in data or 'format' not in data:
        return jsonify({'error': 'content and format are required'}), 400

    content = data['content']
    export_format = data['format']
    title = data.get('title', 'Untitled')

    if export_format == 'html':
        html_content = markdown_to_html(content)
        return jsonify({
            'format': 'html',
            'content': html_content,
            'filename': f"{title}.html"
        })

    elif export_format == 'pdf':
        return jsonify({
            'format': 'pdf',
            'message': 'PDF export requires server-side rendering',
            'html_preview': markdown_to_html(content)
        })

    elif export_format == 'word':
        return jsonify({
            'format': 'word',
            'message': 'Word export requires additional processing',
            'html_content': markdown_to_html(content)
        })

    elif export_format == 'plaintext':
        plain = markdown_to_plaintext(content)
        return jsonify({
            'format': 'plaintext',
            'content': plain,
            'filename': f"{title}.txt"
        })

    return jsonify({'error': f'Unknown format: {export_format}'}), 400


def markdown_to_html(md_content):
    import markdown
    html = markdown.markdown(md_content, extensions=[
        'extra', 'codehilite', 'toc', 'tables', 'fenced_code'
    ])

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Article</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }}
        h1, h2, h3 {{ margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }}
        h1 {{ font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }}
        h2 {{ font-size: 1.5em; }}
        h3 {{ font-size: 1.25em; }}
        p {{ margin: 1em 0; }}
        blockquote {{ border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }}
        code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }}
        pre {{ background: #f4f4f4; padding: 1em; border-radius: 8px; overflow-x: auto; }}
        pre code {{ background: none; padding: 0; }}
        ul, ol {{ padding-left: 2em; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px 12px; }}
        th {{ background: #f4f4f4; }}
        img {{ max-width: 100%; height: auto; }}
        a {{ color: #0366d6; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
{html}
</body>
</html>"""


def markdown_to_plaintext(md_content):
    text = md_content
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'^\s*[-*+]\s+', '• ', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
