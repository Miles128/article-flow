from flask import Blueprint, request, jsonify
from ..models import ResearchMaterial, Claim
from ..decorators import with_llm
from ..utils import parse_json_from_llm, get_field
from ..utils_ssrf import fetch_url_safely
import logging
from bs4 import BeautifulSoup
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

bp = Blueprint('research', __name__)

MAX_CONTENT_LENGTH = 500_000


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

    url = data['url'].strip()

    success, content, resolved_url = fetch_url_safely(url, max_size=2 * 1024 * 1024)
    if not success:
        return jsonify({'error': content}), 400

    try:
        soup = BeautifulSoup(content, 'html.parser')

        for script in soup(['script', 'style', 'nav', 'footer', 'aside']):
            script.decompose()

        title = soup.title.string if soup.title else ''
        if not title:
            h1 = soup.find('h1')
            title = h1.get_text(strip=True) if h1 else '未命名'

        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        if main_content:
            paragraphs = main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            extracted = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
        else:
            extracted = soup.get_text(strip=True)

        if len(extracted) > MAX_CONTENT_LENGTH:
            extracted = extracted[:MAX_CONTENT_LENGTH]

        return jsonify({
            'title': title,
            'content': extracted,
            'source_url': url,
            'source_type': 'web'
        })

    except Exception as e:
        logger.error(f'HTML parsing error for {url}: {e}', exc_info=True)
        return jsonify({'error': '页面解析失败'}), 500


@bp.route('/summarize', methods=['POST'])
@with_llm
def summarize(llm, data):
    content = data['content']
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({'error': '内容过长，请缩减后重试'}), 400

    max_length = min(int(get_field(data, 'max_length', 'maxLength') or 200), 500)
    summary = llm.summarize_content(content, max_length)
    return {'summary': summary}


@bp.route('/extract-keywords', methods=['POST'])
@with_llm
def extract_keywords(llm, data):
    count = min(int(get_field(data, 'count') or 5), 20)
    keywords = llm.extract_keywords(data['content'], count)
    return {'keywords': keywords}


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

    current_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

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


@bp.route('/claims', methods=['GET'])
def get_claims():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    return jsonify(Claim.get_by_project(project_id))


@bp.route('/claims', methods=['POST'])
def create_claim():
    data = request.json or {}
    project_id = get_field(data, 'project_id', 'projectId')
    if not project_id or not data.get('text'):
        return jsonify({'error': 'project_id and text are required'}), 400
    claim = Claim.create(
        project_id=project_id,
        text=data['text'],
        material_id=get_field(data, 'material_id', 'materialId') or '',
        source_quote=get_field(data, 'source_quote', 'sourceQuote') or '',
        verified=data.get('verified', False),
    )
    return jsonify(claim), 201


@bp.route('/claims/<claim_id>', methods=['DELETE'])
def delete_claim(claim_id):
    if Claim.delete(claim_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Claim not found'}), 404


@bp.route('/claims/verify', methods=['POST'])
@with_llm
def verify_claims(llm, data):
    project_id = get_field(data, 'project_id', 'projectId')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    claims = Claim.get_by_project(project_id)
    result = llm.verify_claims(data['content'], claims)
    parsed = parse_json_from_llm(result)
    return parsed or {'raw_result': result}


@bp.route('/research-package', methods=['GET'])
def get_research_package():
    project_id = request.args.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    materials = ResearchMaterial.get_by_project(project_id)
    claims = Claim.get_by_project(project_id)
    return jsonify({
        'materials': materials,
        'claims': claims,
        'material_count': len(materials),
        'claim_count': len(claims),
    })


@bp.route('/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    result = ResearchMaterial.delete(material_id)
    if result:
        return jsonify({'success': True})

    return jsonify({'error': 'Material not found'}), 404
