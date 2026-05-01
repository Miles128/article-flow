from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

in_memory_db = {
    'projects': [],
    'project_contents': [],
    'topics': [],
    'research_materials': [],
    'outlines': [],
    'version_history': [],
}


def init_sample_data():
    if not in_memory_db['projects']:
        sample_project = {
            '_id': str(uuid.uuid4()),
            'title': '示例项目：AI 时代的内容创作',
            'workspace': 'general',
            'current_step': 1,
            'word_count': 0,
            'target_word_count': 2000,
            'ai_taste_score': 0,
            'status': 'draft',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'breakpoints': {
                'specification': False,
                'draft': False
            }
        }
        in_memory_db['projects'].append(sample_project)


projects_bp = Blueprint('projects', __name__)


@projects_bp.route('', methods=['GET'])
def get_projects():
    projects = sorted(in_memory_db['projects'], key=lambda x: x['updated_at'], reverse=True)
    return jsonify(projects)


@projects_bp.route('', methods=['POST'])
def create_project():
    data = request.json
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400
    
    project = {
        '_id': str(uuid.uuid4()),
        'title': data['title'],
        'workspace': data.get('workspace', 'general'),
        'current_step': 1,
        'word_count': 0,
        'target_word_count': data.get('target_word_count', 2000),
        'ai_taste_score': 0,
        'status': 'draft',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
        'breakpoints': {
            'specification': False,
            'draft': False
        }
    }
    in_memory_db['projects'].append(project)
    
    return jsonify(project), 201


@projects_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    for p in in_memory_db['projects']:
        if p['_id'] == project_id:
            return jsonify(p)
    return jsonify({'error': 'Project not found'}), 404


@projects_bp.route('/<project_id>', methods=['PATCH'])
def update_project(project_id):
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    allowed_fields = ['title', 'workspace', 'current_step', 'word_count', 
                      'target_word_count', 'ai_taste_score', 'status', 'breakpoints']
    
    for p in in_memory_db['projects']:
        if p['_id'] == project_id:
            for k, v in data.items():
                if k in allowed_fields:
                    p[k] = v
            p['updated_at'] = datetime.utcnow()
            return jsonify(p)
    
    return jsonify({'error': 'Project not found'}), 404


@projects_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    for i, p in enumerate(in_memory_db['projects']):
        if p['_id'] == project_id:
            del in_memory_db['projects'][i]
            in_memory_db['project_contents'] = [c for c in in_memory_db['project_contents'] if c['project_id'] != project_id]
            in_memory_db['topics'] = [t for t in in_memory_db['topics'] if t['project_id'] != project_id]
            in_memory_db['research_materials'] = [m for m in in_memory_db['research_materials'] if m['project_id'] != project_id]
            in_memory_db['outlines'] = [o for o in in_memory_db['outlines'] if o['project_id'] != project_id]
            in_memory_db['version_history'] = [v for v in in_memory_db['version_history'] if v['project_id'] != project_id]
            return jsonify({'success': True})
    return jsonify({'error': 'Project not found'}), 404


@projects_bp.route('/<project_id>/contents', methods=['GET'])
def get_project_contents(project_id):
    step = request.args.get('step', type=int)
    contents = [c for c in in_memory_db['project_contents'] if c['project_id'] == project_id]
    if step is not None:
        contents = [c for c in contents if c['step'] == step]
    return jsonify(contents)


@projects_bp.route('/<project_id>/contents', methods=['POST'])
def create_project_content(project_id):
    data = request.json
    if not data or 'step' not in data or 'content' not in data:
        return jsonify({'error': 'Step and content are required'}), 400
    
    content = {
        '_id': str(uuid.uuid4()),
        'project_id': project_id,
        'step': data['step'],
        'content_type': data.get('content_type', 'markdown'),
        'content': data['content'],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    in_memory_db['project_contents'].append(content)
    
    return jsonify(content), 201


@projects_bp.route('/<project_id>/contents/<content_id>', methods=['PUT'])
def update_project_content(project_id, content_id):
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'Content is required'}), 400
    
    for c in in_memory_db['project_contents']:
        if c['_id'] == content_id and c['project_id'] == project_id:
            c['content'] = data['content']
            c['updated_at'] = datetime.utcnow()
            return jsonify(c)
    
    return jsonify({'error': 'Content not found'}), 404


topics_bp = Blueprint('topics', __name__)


@topics_bp.route('', methods=['GET'])
def get_topics():
    project_id = request.args.get('project_id')
    topics = in_memory_db['topics']
    if project_id:
        topics = [t for t in topics if t['project_id'] == project_id]
    return jsonify(topics)


@topics_bp.route('', methods=['POST'])
def create_topic():
    data = request.json
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400
    
    topic = {
        '_id': str(uuid.uuid4()),
        'project_id': data.get('project_id', ''),
        'title': data['title'],
        'description': data.get('description', ''),
        'tags': data.get('tags', []),
        'priority': data.get('priority', 1),
        'status': 'pending',
        'evaluation': {
            'trend_score': 0,
            'competition_score': 0,
            'audience_score': 0,
            'overall_score': 0
        },
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    in_memory_db['topics'].append(topic)
    
    return jsonify(topic), 201


@topics_bp.route('/<topic_id>', methods=['PATCH'])
def update_topic(topic_id):
    data = request.json
    for t in in_memory_db['topics']:
        if t['_id'] == topic_id:
            for k, v in data.items():
                t[k] = v
            t['updated_at'] = datetime.utcnow()
            return jsonify(t)
    return jsonify({'error': 'Topic not found'}), 404


writing_bp = Blueprint('writing', __name__)


@writing_bp.route('/continue', methods=['POST'])
def continue_writing():
    data = request.json
    content = data.get('content', '')
    context = data.get('context', {})
    
    return jsonify({
        'success': True,
        'generated_content': '\n\n（AI 续写示例：AI 续写功能需要配置 API Key 后才能使用。）'
    })


@writing_bp.route('/polish', methods=['POST'])
def polish_content():
    data = request.json
    content = data.get('content', '')
    style = data.get('style', 'professional')
    
    return jsonify({
        'success': True,
        'polished_content': content,
        'changes': ['AI 润色功能需要配置 API Key 后才能使用。']
    })


@writing_bp.route('/style-transform', methods=['POST'])
def style_transform():
    data = request.json
    
    return jsonify({
        'success': True,
        'transformed_content': data.get('content', ''),
        'style_applied': data.get('target_style', 'professional')
    })


@writing_bp.route('/expand', methods=['POST'])
def expand_content():
    data = request.json
    
    return jsonify({
        'success': True,
        'expanded_content': data.get('content', '') + '\n\n（AI 扩写功能需要配置 API Key。）'
    })


@writing_bp.route('/condense', methods=['POST'])
def condense_content():
    data = request.json
    
    return jsonify({
        'success': True,
        'condensed_content': data.get('content', '')
    })


@writing_bp.route('/ai-taste-detect', methods=['POST'])
def ai_taste_detect():
    data = request.json
    
    return jsonify({
        'success': True,
        'score': 50,
        'suggestions': [
            'AI 味检测功能需要配置 API Key 后才能使用。'
        ]
    })


outline_bp = Blueprint('outline', __name__)


@outline_bp.route('', methods=['GET'])
def get_outline():
    project_id = request.args.get('project_id')
    for o in in_memory_db['outlines']:
        if o['project_id'] == project_id:
            return jsonify(o)
    return jsonify(None)


@outline_bp.route('', methods=['POST'])
def create_outline():
    data = request.json
    
    outline = {
        '_id': str(uuid.uuid4()),
        'project_id': data.get('project_id', ''),
        'title': data.get('title', '新大纲'),
        'nodes': data.get('nodes', []),
        'version': 1,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    
    existing = next((o for o in in_memory_db['outlines'] if o['project_id'] == outline['project_id']), None)
    if existing:
        existing.update(outline)
        existing['updated_at'] = datetime.utcnow()
        return jsonify(existing)
    
    in_memory_db['outlines'].append(outline)
    return jsonify(outline), 201


@outline_bp.route('/generate', methods=['POST'])
def generate_outline():
    data = request.json
    topic = data.get('topic', '新主题')
    
    return jsonify({
        'success': True,
        'outline': {
            'title': f'{topic} - AI 生成大纲',
            'nodes': [
                {
                    'id': '1',
                    'title': '引言',
                    'level': 1,
                    'children': [
                        {'id': '1-1', 'title': '背景介绍', 'level': 2},
                        {'id': '1-2', 'title': '研究意义', 'level': 2}
                    ]
                },
                {
                    'id': '2',
                    'title': '正文',
                    'level': 1,
                    'children': [
                        {'id': '2-1', 'title': '第一章：现状分析', 'level': 2},
                        {'id': '2-2', 'title': '第二章：解决方案', 'level': 2}
                    ]
                },
                {
                    'id': '3',
                    'title': '结论',
                    'level': 1,
                    'children': []
                }
            ]
        }
    })


research_bp = Blueprint('research', __name__)


@research_bp.route('', methods=['GET'])
def get_materials():
    project_id = request.args.get('project_id')
    materials = [m for m in in_memory_db['research_materials'] if m['project_id'] == project_id]
    return jsonify(materials)


@research_bp.route('', methods=['POST'])
def add_material():
    data = request.json
    
    material = {
        '_id': str(uuid.uuid4()),
        'project_id': data.get('project_id', ''),
        'source_type': data.get('source_type', 'web'),
        'source_url': data.get('source_url', ''),
        'title': data.get('title', '新资料'),
        'content': data.get('content', ''),
        'summary': data.get('summary', ''),
        'keywords': data.get('keywords', []),
        'citation': '',
        'created_at': datetime.utcnow()
    }
    in_memory_db['research_materials'].append(material)
    
    return jsonify(material), 201


@research_bp.route('/fetch-url', methods=['POST'])
def fetch_url():
    data = request.json
    url = data.get('url', '')
    
    return jsonify({
        'success': True,
        'title': f'网页内容 - {url[:50]}...',
        'content': '（网页抓取功能已准备就绪。配置好环境后即可抓取真实内容。）',
        'summary': '这是抓取的网页摘要示例。',
        'keywords': ['AI', '技术', '创新']
    })


@research_bp.route('/summarize', methods=['POST'])
def summarize_content():
    data = request.json
    content = data.get('content', '')
    
    return jsonify({
        'success': True,
        'summary': '（AI 摘要功能需要配置 API Key。）',
        'keywords': ['关键词1', '关键词2', '关键词3']
    })


format_bp = Blueprint('format', __name__)


@format_bp.route('/convert', methods=['POST'])
def convert_format():
    data = request.json
    content = data.get('content', '')
    target_platform = data.get('target_platform', 'wechat')
    
    return jsonify({
        'success': True,
        'converted_content': content,
        'platform': target_platform,
        'warnings': ['格式转换功能已就绪。']
    })


@format_bp.route('/export', methods=['POST'])
def export_content():
    data = request.json
    format_type = data.get('format', 'markdown')
    
    return jsonify({
        'success': True,
        'format': format_type,
        'content': data.get('content', '')
    })


review_bp = Blueprint('review', __name__)


@review_bp.route('/check-compliance', methods=['POST'])
def check_compliance():
    data = request.json
    
    return jsonify({
        'success': True,
        'compliant': True,
        'issues': [],
        'suggestions': ['合规检查功能需要配置 API Key。']
    })


@review_bp.route('/check-logic', methods=['POST'])
def check_logic():
    data = request.json
    
    return jsonify({
        'success': True,
        'logical_score': 85,
        'issues': [],
        'suggestions': ['逻辑检查功能需要配置 API Key。']
    })


ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/providers', methods=['GET'])
def get_providers():
    return jsonify({
        'providers': [
            {'id': 'openai', 'name': 'OpenAI', 'models': ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']},
            {'id': 'anthropic', 'name': 'Anthropic', 'models': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']},
            {'id': 'zhipu', 'name': '智谱 AI', 'models': ['glm-4', 'glm-3-turbo']}
        ],
        'current_provider': os.getenv('DEFAULT_MODEL_PROVIDER', 'openai'),
        'current_model': os.getenv('DEFAULT_MODEL_NAME', 'gpt-4-turbo-preview')
    })


@ai_bp.route('/test', methods=['POST'])
def test_ai():
    data = request.json
    provider = data.get('provider', 'openai')
    model = data.get('model', 'gpt-4')
    
    return jsonify({
        'success': False,
        'error': f'需要配置 {provider} API Key 才能测试。请在 .env 文件中设置对应的 API Key。',
        'provider': provider,
        'model': model
    })


hotnews_bp = Blueprint('hotnews', __name__)


@hotnews_bp.route('/platforms', methods=['GET'])
def get_platforms():
    return jsonify({
        'platforms': [
            {'id': 'weibo', 'name': '微博热搜'},
            {'id': 'zhihu', 'name': '知乎热榜'},
            {'id': 'bilibili', 'name': 'B站热搜'},
            {'id': 'toutiao', 'name': '今日头条'}
        ]
    })


@hotnews_bp.route('/list', methods=['GET'])
def get_hotnews():
    platform = request.args.get('platform', 'all')
    
    sample_news = [
        {
            'rank': 1,
            'title': 'AI 大模型技术突破：新一代语言模型发布',
            'heat': '2.3亿',
            'platform': 'tech',
            'category': '科技',
            'source_url': '#',
            'trend': 'up'
        },
        {
            'rank': 2,
            'title': '2026 年内容创作者发展趋势报告发布',
            'heat': '1.8亿',
            'platform': 'tech',
            'category': '行业动态',
            'source_url': '#',
            'trend': 'up'
        },
        {
            'rank': 3,
            'title': '自媒体变现新模式：知识付费的黄金时代',
            'heat': '1.2亿',
            'platform': 'business',
            'category': '商业',
            'source_url': '#',
            'trend': 'stable'
        },
        {
            'rank': 4,
            'title': '短视频 vs 长文：内容形式的未来之争',
            'heat': '8800万',
            'platform': 'media',
            'category': '媒体',
            'source_url': '#',
            'trend': 'down'
        },
        {
            'rank': 5,
            'title': 'AI 写作工具评测：哪款最适合内容创作者？',
            'heat': '7200万',
            'platform': 'tech',
            'category': '测评',
            'source_url': '#',
            'trend': 'up'
        }
    ]
    
    return jsonify({
        'platform': platform,
        'items': sample_news,
        'updated_at': datetime.utcnow().isoformat()
    })


@hotnews_bp.route('/trends', methods=['GET'])
def get_trends():
    return jsonify({
        'trends': [
            {'keyword': 'AI 创作', 'count': 150, 'trend': 'rising'},
            {'keyword': '自媒体运营', 'count': 120, 'trend': 'rising'},
            {'keyword': '知识付费', 'count': 90, 'trend': 'stable'},
            {'keyword': '短视频制作', 'count': 80, 'trend': 'declining'},
            {'keyword': '直播带货', 'count': 70, 'trend': 'stable'}
        ]
    })


def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','))
    
    init_sample_data()
    
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(topics_bp, url_prefix='/api/topics')
    app.register_blueprint(research_bp, url_prefix='/api/research')
    app.register_blueprint(outline_bp, url_prefix='/api/outline')
    app.register_blueprint(writing_bp, url_prefix='/api/writing')
    app.register_blueprint(review_bp, url_prefix='/api/review')
    app.register_blueprint(format_bp, url_prefix='/api/format')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(hotnews_bp, url_prefix='/api/hotnews')
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Article Flow API is running (in-memory mode)'}
    
    return app


if __name__ == '__main__':
    app = create_app()
    print('Starting Article Flow API (in-memory mode) on http://localhost:5001')
    app.run(host='0.0.0.0', port=5001, debug=True)
