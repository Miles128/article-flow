from flask import Blueprint, request, jsonify
from ..services.llm_service import get_llm_service
import json

bp = Blueprint('format', __name__)

@bp.route('/normalize', methods=['POST'])
def normalize_markdown():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    content = data['content']
    
    try:
        llm = get_llm_service()
        
        prompt = f"""请将以下Markdown内容规范化，确保格式统一：

{content}

规范化要求：
1. 标题层级统一（# 一级、## 二级、### 三级）
2. 列表格式统一
3. 引用格式统一
4. 代码块格式统一
5. 链接格式统一
6. 空行统一（标题前后空一行）

请直接输出规范化后的Markdown内容。"""
        
        result = llm.chat([
            {'role': 'system', 'content': '你是一位Markdown格式专家，擅长统一文档格式。'},
            {'role': 'user', 'content': prompt}
        ])
        
        return jsonify({'normalized_content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/convert', methods=['POST'])
def convert_format():
    data = request.json
    if not data or 'content' not in data or 'target_platform' not in data:
        return jsonify({'error': 'content and target_platform are required'}), 400
    
    content = data['content']
    target_platform = data['target_platform']
    
    try:
        llm = get_llm_service()
        converted = llm.convert_format(content, target_platform)
        
        return jsonify({
            'target_platform': target_platform,
            'converted_content': converted
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/platforms', methods=['GET'])
def get_platforms():
    platforms = [
        {
            'id': 'wechat',
            'name': '微信公众号',
            'icon': 'message-circle',
            'description': '段落短小，对话式风格',
            'rules': {
                'max_paragraph_length': 150,
                'style': 'conversational',
                'use_emoji': True,
                'bold_highlights': True
            }
        },
        {
            'id': 'zhihu',
            'name': '知乎',
            'icon': 'book-open',
            'description': '结构清晰，专业深度',
            'rules': {
                'max_paragraph_length': 300,
                'style': 'professional',
                'use_quotes': True,
                'structured_headings': True
            }
        },
        {
            'id': 'xiaohongshu',
            'name': '小红书',
            'icon': 'book-marked',
            'description': '活泼有趣，emoji点缀',
            'rules': {
                'max_paragraph_length': 80,
                'style': 'casual',
                'use_emoji': True,
                'use_hashtags': True,
                'short_paragraphs': True
            }
        },
        {
            'id': 'bilibili',
            'name': 'B站专栏',
            'icon': 'video',
            'description': '年轻风格，图文并茂',
            'rules': {
                'max_paragraph_length': 200,
                'style': 'casual',
                'use_emoji': True,
                'image_friendly': True
            }
        },
        {
            'id': 'jianshu',
            'name': '简书',
            'icon': 'file-text',
            'description': '简洁清新，注重内容',
            'rules': {
                'max_paragraph_length': 250,
                'style': 'general',
                'clean_markdown': True
            }
        },
        {
            'id': 'toutiao',
            'name': '今日头条',
            'icon': 'newspaper',
            'description': '信息密度高，标题重要',
            'rules': {
                'max_paragraph_length': 180,
                'style': 'informative',
                'catchy_title': True,
                'short_paragraphs': True
            }
        }
    ]
    
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
        'extra',
        'codehilite',
        'toc',
        'tables',
        'fenced_code'
    ])
    
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Article</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }}
        h1, h2, h3 {{
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }}
        h1 {{ font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }}
        h2 {{ font-size: 1.5em; }}
        h3 {{ font-size: 1.25em; }}
        p {{ margin: 1em 0; }}
        blockquote {{
            border-left: 4px solid #ddd;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }}
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
    import re
    
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
