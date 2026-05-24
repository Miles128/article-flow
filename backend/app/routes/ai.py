"""AI 路由 - 安全加固"""
import os
import logging
from flask import Blueprint, request, jsonify
from ..services.llm_service import get_llm_service
from ..utils import translate_error, extract_llm_config
from ..decorators import with_llm

logger = logging.getLogger(__name__)

bp = Blueprint('ai', __name__)


@bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'messages' not in data:
        return jsonify({'error': 'messages are required'}), 400

    try:
        cfg = extract_llm_config(data)
        llm = get_llm_service(
            provider=data.get('provider') or 'custom',
            model_name=cfg['model_name'] or data.get('model_name'),
            api_key=cfg['api_key'],
            base_url=cfg['base_url'],
            temperature=cfg.get('temperature', 0.7),
        )

        response = llm.chat(data['messages'])

        return jsonify({
            'response': response,
            'model': llm.model_name
        })
    except Exception as e:
        return jsonify({'error': translate_error(e)}), 500


@bp.route('/models', methods=['GET'])
def get_available_models():
    models = {
        'openai': [
            {'id': 'gpt-4o', 'name': 'GPT-4o', 'description': '最新旗舰模型，多模态支持'},
            {'id': 'gpt-4o-mini', 'name': 'GPT-4o Mini', 'description': '经济实惠，快速响应'},
            {'id': 'gpt-4-turbo', 'name': 'GPT-4 Turbo', 'description': 'GPT-4增强版，更快速'},
            {'id': 'gpt-3.5-turbo', 'name': 'GPT-3.5 Turbo', 'description': '经典模型，快速经济'}
        ],
        'anthropic': [
            {'id': 'claude-sonnet-4-20250514', 'name': 'Claude Sonnet 4', 'description': '最新平衡模型'},
            {'id': 'claude-3-5-sonnet-20241022', 'name': 'Claude 3.5 Sonnet', 'description': '能力与速度的平衡'},
            {'id': 'claude-3-5-haiku-20241022', 'name': 'Claude 3.5 Haiku', 'description': '最快最经济'}
        ],
        'zhipu': [
            {'id': 'glm-4-plus', 'name': 'GLM-4 Plus', 'description': '智谱增强版大模型'},
            {'id': 'glm-4-flash', 'name': 'GLM-4 Flash', 'description': '智谱快速模型'},
            {'id': 'glm-4', 'name': 'GLM-4', 'description': '智谱标准大模型'}
        ]
    }

    return jsonify(models)


@bp.route('/generate', methods=['POST'])
@with_llm(require_content=False, content_key='prompt')
def generate(llm, data):
    if 'prompt' not in data:
        return jsonify({'error': 'prompt is required'}), 400

    system_prompt = data.get('system_prompt', '你是一位专业的写作助手。')
    result = llm.chat([
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': data['prompt']}
    ])
    return {'response': result}


@bp.route('/config', methods=['GET'])
def get_config():
    config = {
        'default_provider': os.getenv('DEFAULT_MODEL_PROVIDER', 'openai'),
        'default_model': os.getenv('DEFAULT_MODEL_NAME', 'gpt-4o-mini'),
        'providers': {
            'openai': {
                'configured': bool(os.getenv('OPENAI_API_KEY')),
                'name': 'OpenAI'
            },
            'anthropic': {
                'configured': bool(os.getenv('ANTHROPIC_API_KEY')),
                'name': 'Anthropic'
            },
            'zhipu': {
                'configured': bool(os.getenv('ZHIPU_API_KEY')),
                'name': '智谱AI'
            }
        }
    }

    return jsonify(config)


@bp.route('/test', methods=['POST'])
def test_connection():
    data = request.json
    provider = data.get('provider', 'openai')
    api_key = data.get('api_key')

    if not api_key:
        return jsonify({'success': False, 'message': '请提供 API Key'}), 400

    try:
        if provider == 'openai':
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            client.chat.completions.create(
                model='gpt-3.5-turbo',
                messages=[{'role': 'user', 'content': 'Hi'}],
                max_tokens=5
            )
            return jsonify({'success': True, 'message': 'OpenAI API 连接成功'})

        elif provider == 'anthropic':
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key)
            client.messages.create(
                model='claude-3-haiku-20240307',
                max_tokens=5,
                messages=[{'role': 'user', 'content': 'Hi'}]
            )
            return jsonify({'success': True, 'message': 'Anthropic API 连接成功'})

        elif provider == 'zhipu':
            from openai import OpenAI
            client = OpenAI(
                api_key=api_key,
                base_url='https://open.bigmodel.cn/api/paas/v4/'
            )
            client.chat.completions.create(
                model='glm-4-flash',
                messages=[{'role': 'user', 'content': 'Hi'}],
                max_tokens=5
            )
            return jsonify({'success': True, 'message': '智谱AI API 连接成功'})

        return jsonify({'success': False, 'message': f'未知的 provider: {provider}'}), 400

    except Exception as e:
        # 不泄露完整错误信息
        error_msg = str(e)
        logger.warning(f'API test failed for provider {provider}: {error_msg}')
        # 只返回友好的错误提示
        friendly_msg = translate_error(e)
        return jsonify({'success': False, 'message': friendly_msg}), 500
