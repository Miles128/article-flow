from flask import Blueprint, request, jsonify
from ..services.llm_service import get_llm_service

bp = Blueprint('ai', __name__)

@bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'messages' not in data:
        return jsonify({'error': 'messages are required'}), 400
    
    try:
        llm = get_llm_service(
            provider=data.get('provider'),
            model_name=data.get('model_name')
        )
        
        response = llm.chat(data['messages'])
        
        return jsonify({
            'response': response,
            'provider': llm.provider,
            'model': llm.model_name
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/models', methods=['GET'])
def get_available_models():
    models = {
        'openai': [
            {'id': 'gpt-4-turbo-preview', 'name': 'GPT-4 Turbo', 'description': '最新的GPT-4模型，更强大更快速'},
            {'id': 'gpt-4', 'name': 'GPT-4', 'description': 'GPT-4模型，高级推理能力'},
            {'id': 'gpt-3.5-turbo', 'name': 'GPT-3.5 Turbo', 'description': '快速且经济实惠的模型'}
        ],
        'anthropic': [
            {'id': 'claude-3-opus-20240229', 'name': 'Claude 3 Opus', 'description': 'Claude最强大的模型，高度复杂的任务'},
            {'id': 'claude-3-sonnet-20240229', 'name': 'Claude 3 Sonnet', 'description': '能力与速度的平衡'},
            {'id': 'claude-3-haiku-20240307', 'name': 'Claude 3 Haiku', 'description': '最快最经济的Claude模型'}
        ],
        'zhipu': [
            {'id': 'glm-4', 'name': 'GLM-4', 'description': '智谱最新大模型'},
            {'id': 'glm-3-turbo', 'name': 'GLM-3 Turbo', 'description': '智谱快速模型'}
        ]
    }
    
    return jsonify(models)

@bp.route('/generate', methods=['POST'])
def generate():
    data = request.json
    if not data or 'prompt' not in data:
        return jsonify({'error': 'prompt is required'}), 400
    
    system_prompt = data.get('system_prompt', '你是一位专业的写作助手。')
    
    try:
        llm = get_llm_service(
            provider=data.get('provider'),
            model_name=data.get('model_name')
        )
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': data['prompt']}
        ]
        
        response = llm.chat(messages)
        
        return jsonify({
            'response': response
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/config', methods=['GET'])
def get_config():
    import os
    
    config = {
        'default_provider': os.getenv('DEFAULT_MODEL_PROVIDER', 'openai'),
        'default_model': os.getenv('DEFAULT_MODEL_NAME', 'gpt-4-turbo-preview'),
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
    
    try:
        if provider == 'openai':
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model='gpt-3.5-turbo',
                messages=[{'role': 'user', 'content': 'Hello'}],
                max_tokens=5
            )
            return jsonify({'success': True, 'message': 'OpenAI API 连接成功'})
        
        elif provider == 'anthropic':
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key)
            response = client.messages.create(
                model='claude-3-haiku-20240307',
                max_tokens=5,
                messages=[{'role': 'user', 'content': 'Hello'}]
            )
            return jsonify({'success': True, 'message': 'Anthropic API 连接成功'})
        
        elif provider == 'zhipu':
            from openai import OpenAI
            client = OpenAI(
                api_key=api_key,
                base_url='https://open.bigmodel.cn/api/paas/v4/'
            )
            response = client.chat.completions.create(
                model='glm-4',
                messages=[{'role': 'user', 'content': 'Hello'}],
                max_tokens=5
            )
            return jsonify({'success': True, 'message': '智谱AI API 连接成功'})
        
        return jsonify({'success': False, 'message': f'未知的 provider: {provider}'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
