"""配图生成路由 — AI HTML 配图 + API 生图双模式"""
from flask import Blueprint, request, jsonify
from ..decorators import with_llm
from ..utils import translate_error

bp = Blueprint('illustration', __name__)


@bp.route('/generate-html', methods=['POST'])
@with_llm(require_content=False)
def generate_html_illustration(llm, data):
    """方案 A：LLM 生成 SVG / HTML 配图代码"""
    topic = (data.get('topic') or '').strip()
    quote = (data.get('quote') or '').strip()
    style = (data.get('style') or 'modern').strip()
    color_scheme = data.get('color_scheme') or {}

    if not topic and not quote:
        return jsonify({'error': 'topic or quote is required'}), 400

    # 构建配色描述
    color_desc = ''
    if color_scheme:
        name = color_scheme.get('name', '')
        bg = color_scheme.get('bg', '')
        primary = color_scheme.get('primary', '')
        accent = color_scheme.get('accent', '')
        if name:
            color_desc = f'\n配色方案：{name}（背景 {bg}、主色 {primary}、点缀 {accent}）'

    prompt = (
        f'请为以下内容设计一张精美的 SVG 配图（用于公众号/文章封面）。\n\n'
        f'主题：{topic}\n'
        f'引用金句：{quote}\n'
        f'风格：{style}{color_desc}\n\n'
        '要求：\n'
        '1. 输出纯 SVG 代码（不要 HTML 包裹，不要 markdown 代码块标记）\n'
        '2. viewBox 设为 "0 0 800 450"（16:9 比例）\n'
        '3. 包含文字排版（居中、醒目），使用系统字体\n'
        '4. 使用渐变和几何元素装饰，现代简洁风格\n'
        '5. 配色和谐、层次分明\n'
        '6. 适合社交媒体分享（微信/微博/小红书）\n\n'
        '请直接输出 SVG 代码：'
    )

    try:
        svg = llm.chat([
            {'role': 'system', 'content': '你是一位资深视觉设计师，擅长创作精美的 SVG 配图。直接输出 SVG 代码，不要加任何解释或代码块标记。'},
            {'role': 'user', 'content': prompt},
        ])
        # 清理可能的代码块标记
        svg = svg.strip()
        if svg.startswith('```'):
            svg = svg.split('\n', 1)[1] if '\n' in svg else svg[3:]
        if svg.endswith('```'):
            svg = svg[:-3].strip()
        if svg.startswith('svg'):
            svg = '<' + svg
        if not svg.startswith('<svg'):
            # 尝试提取 <svg>...</svg>
            import re
            m = re.search(r'(<svg[\s\S]*?</svg>)', svg, re.IGNORECASE)
            if m:
                svg = m.group(1)
            else:
                return jsonify({'error': 'AI 返回格式异常，请重试', 'raw': svg[:500]}), 500

        return jsonify({'svg': svg, 'type': 'svg'})
    except Exception as e:
        return jsonify({'error': translate_error(e)}), 500


@bp.route('/generate-image', methods=['POST'])
@with_llm(require_content=False)
def generate_api_image(llm, data):
    """方案 B：LLM 生成 prompt → 图片 API 生图"""
    topic = (data.get('topic') or '').strip()
    quote = (data.get('quote') or '').strip()
    style = (data.get('style') or '现代简约').strip()
    provider = (data.get('provider') or 'openai').strip()  # openai / siliconflow
    image_api_key = (data.get('image_api_key') or '').strip()
    image_base_url = (data.get('image_base_url') or '').strip()
    image_model = (data.get('image_model') or 'dall-e-3').strip()

    if not topic and not quote:
        return jsonify({'error': 'topic or quote is required'}), 400
    if not image_api_key:
        return jsonify({'error': '请先配置图片生成 API Key'}), 400

    # Step 1: LLM 生成英文图片 prompt
    prompt_gen_prompt = (
        f'你是一位专业的 AI 绘图 prompt 工程师。请为以下内容生成一个英文 DALL·E / Flux 图片 prompt。\n\n'
        f'主题：{topic}\n'
        f'金句：{quote}\n'
        f'视觉风格：{style}\n\n'
        '要求：\n'
        '1. 用英文输出（图片 API 对英文更友好）\n'
        '2. 描述画面构图、光线、色彩、氛围\n'
        '3. 适合 16:9 比例\n'
        '4. 不超过 200 词\n'
        '5. 避免敏感或版权内容\n'
        '6. 风格提示：flat vector illustration / modern editorial / clean, 适合公众号配图\n\n'
        '请直接输出英文 prompt（不要加任何前缀或引号）：'
    )

    try:
        image_prompt = llm.chat([
            {'role': 'system', 'content': 'You generate DALL-E / Flux image prompts. Output only the English prompt, no quotes, no prefixes.'},
            {'role': 'user', 'content': prompt_gen_prompt},
        ]).strip()
    except Exception as e:
        return jsonify({'error': translate_error(e)}), 500

    # Step 2: 调用图片 API
    try:
        if provider == 'siliconflow':
            image_url = _call_siliconflow_image(image_api_key, image_base_url, image_model, image_prompt)
        else:
            image_url = _call_openai_image(image_api_key, image_base_url, image_model, image_prompt)

        return jsonify({
            'type': 'url',
            'image_url': image_url,
            'prompt_used': image_prompt,
        })
    except Exception as e:
        return jsonify({'error': f'图片生成失败: {str(e)}', 'prompt_used': image_prompt}), 500


def _call_openai_image(api_key: str, base_url: str, model: str, prompt: str) -> str:
    """调用 OpenAI DALL·E API"""
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=base_url or 'https://api.openai.com/v1')
    resp = client.images.generate(
        model=model or 'dall-e-3',
        prompt=prompt,
        n=1,
        size='1792x1024',
        quality='standard',
    )
    return resp.data[0].url or ''


def _call_siliconflow_image(api_key: str, base_url: str, model: str, prompt: str) -> str:
    """调用硅基流动 Flux / SD 生图 API"""
    import requests
    url = (base_url or 'https://api.siliconflow.cn/v1') + '/images/generations'
    resp = requests.post(
        url,
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={
            'model': model or 'Kwai-Kolors/Kolors',
            'prompt': prompt,
            'n': 1,
            'size': '1024x576',
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()['data'][0]['url']
