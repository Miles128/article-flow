import os
import json
import threading
from flask import Flask
from flask_cors import CORS
from .config import Config

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
_lock = threading.Lock()


class FileCollection:
    def __init__(self, name):
        self.name = name
        self.path = os.path.join(DATA_DIR, f'{name}.json')
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(self.path):
            with open(self.path, 'w') as f:
                json.dump([], f)

    def _read(self):
        with _lock:
            with open(self.path, 'r') as f:
                return json.load(f)

    def _write(self, data):
        with _lock:
            with open(self.path, 'w') as f:
                json.dump(data, f, indent=2, default=str)

    def find(self, query=None, sort=None):
        items = self._read()
        if query:
            items = [i for i in items if all(i.get(k) == v for k, v in query.items())]
        if sort:
            key = sort[0][0]
            reverse = sort[0][1] < 0
            items.sort(key=lambda x: x.get(key, ''), reverse=reverse)
        return items

    def find_one(self, query):
        items = self._read()
        for i in items:
            if all(i.get(k) == v for k, v in query.items()):
                return i
        return None

    def insert_one(self, doc):
        items = self._read()
        items.append(doc)
        self._write(items)
        return type('Result', (), {'inserted_id': doc.get('_id', '')})()

    def update_one(self, query, update):
        items = self._read()
        found = False
        set_data = update.get('$set', {})
        for i in items:
            if all(i.get(k) == v for k, v in query.items()):
                i.update(set_data)
                found = True
                break
        if found:
            self._write(items)
        return type('Result', (), {'modified_count': 1 if found else 0})()

    def delete_one(self, query):
        items = self._read()
        for idx, item in enumerate(items):
            if all(item.get(k) == v for k, v in query.items()):
                items.pop(idx)
                self._write(items)
                return type('Result', (), {'deleted_count': 1})()
        return type('Result', (), {'deleted_count': 0})()


db_data = {
    'projects': FileCollection('projects'),
    'project_contents': FileCollection('project_contents'),
    'topics': FileCollection('topics'),
    'research_materials': FileCollection('research_materials'),
    'outlines': FileCollection('outlines'),
    'version_history': FileCollection('version_history'),
    'comments': FileCollection('comments'),
}


def create_app(config_class=Config):
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(config_class)
    CORS(app, origins=app.config['CORS_ORIGINS'])

    from .routes import projects, topics, research, outline, writing, review, format, ai, hotnews
    app.register_blueprint(projects.bp, url_prefix='/api/projects')
    app.register_blueprint(topics.bp, url_prefix='/api/topics')
    app.register_blueprint(research.bp, url_prefix='/api/research')
    app.register_blueprint(outline.bp, url_prefix='/api/outline')
    app.register_blueprint(writing.bp, url_prefix='/api/writing')
    app.register_blueprint(review.bp, url_prefix='/api/review')
    app.register_blueprint(format.bp, url_prefix='/api/format')
    app.register_blueprint(ai.bp, url_prefix='/api/ai')
    app.register_blueprint(hotnews.bp, url_prefix='/api/hotnews')

    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Article Flow API is running'}

    return app
