from flask import Blueprint, request, jsonify
from ..models import ResearchMaterial
from ..services.llm_service import get_llm_service
import requests
from bs4 import BeautifulSoup
from datetime import datetime

bp = Blueprint('research', __name__)

@bp.route('', methods=['GET'])
def get_research_materials():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    
    materials = ResearchMaterial.get_by_project(project_id)
    return jsonify(materials)

@bp.route('', methods=['POST'])
def create_research_material():
    data = request.json
    if not data or 'project_id' not in data:
        return jsonify({'error': 'project_id is required'}), 400
    
    material = ResearchMaterial.create(
        project_id=data['project_id'],
        source_type=data.get('source_type', 'web'),
        source_url=data.get('source_url', ''),
        title=data.get('title', ''),
        content=data.get('content', ''),
        summary=data.get('summary', ''),
        keywords=data.get('keywords', [])
    )
    
    return jsonify(material), 201

@bp.route('/fetch-url', methods=['POST'])
def fetch_url():
    data = request.json
    if not data or 'url' not in data:
        return jsonify({'error': 'url is required'}), 400
    
    url = data['url']
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for script in soup(['script', 'style', 'nav', 'footer', 'aside']):
            script.decompose()
        
        title = soup.title.string if soup.title else ''
        if not title:
            h1 = soup.find('h1')
            title = h1.get_text(strip=True) if h1 else '未命名'
        
        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        if main_content:
            paragraphs = main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
        else:
            content = soup.get_text(strip=True)
        
        return jsonify({
            'title': title,
            'content': content,
            'source_url': url,
            'source_type': 'web'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    max_length = data.get('max_length', 200)
    
    try:
        llm = get_llm_service()
        summary = llm.summarize_content(data['content'], max_length)
        
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/extract-keywords', methods=['POST'])
def extract_keywords():
    data = request.json
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    count = data.get('count', 5)
    
    try:
        llm = get_llm_service()
        keywords = llm.extract_keywords(data['content'], count)
        
        return jsonify({'keywords': keywords})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/generate-citation', methods=['POST'])
def generate_citation():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    source_type = data.get('source_type', 'web')
    title = data.get('title', '')
    author = data.get('author', '')
    url = data.get('url', '')
    publication_date = data.get('publication_date', '')
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    citations = {
        'apa': '',
        'mla': '',
        'gb': ''
    }
    
    if source_type == 'web':
        citations['apa'] = f"{author}. ({publication_date or current_date}). {title}. 检索自 {url}"
        citations['mla'] = f"{author}. \"{title}\". {publication_date or current_date}, {url}."
        citations['gb'] = f"{author}. {title}[EB/OL]. ({publication_date or current_date})[{current_date}]. {url}."
    elif source_type == 'book':
        publisher = data.get('publisher', '')
        citations['apa'] = f"{author}. ({publication_date or current_date}). {title}. {publisher}."
        citations['mla'] = f"{author}. {title}. {publisher}, {publication_date or current_date}."
        citations['gb'] = f"{author}. {title}[M]. {publisher}, {publication_date or current_date}."
    
    return jsonify(citations)

@bp.route('/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    from .. import db
    from bson.objectid import ObjectId
    
    result = db.research_materials.delete_one({'_id': ObjectId(material_id)})
    if result.deleted_count > 0:
        return jsonify({'success': True})
    
    return jsonify({'error': 'Material not found'}), 404
