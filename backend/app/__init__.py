import os
import json
import uuid
import threading
import tempfile
import logging
from flask import Flask, g, request, jsonify
from flask_cors import CORS
from .config import Config

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

# 读写锁：允许多个并发读，写操作独占
_read_lock = threading.Lock()   # 读锁
_write_lock = threading.Lock()  # 写锁
_readers = 0                    # 当前读者数量


class _RWLock:
    """简单的读写锁实现，读多写少场景下优于全局互斥锁"""

    def __init__(self):
        self._lock = threading.Lock()
        self._read_ready = threading.Condition(self._lock)
        self._readers = 0

    def acquire_read(self):
        with self._lock:
            self._readers += 1
        return self

    def release_read(self):
        with self._lock:
            self._readers -= 1
            if self._readers == 0:
                self._read_ready.notify_all()

    def acquire_write(self):
        self._lock.acquire()
        while self._readers > 0:
            self._read_ready.wait()
        return self

    def release_write(self):
        self._lock.release()

    class _ReadContext:
        def __init__(self, rwlock):
            self.rwlock = rwlock
        def __enter__(self):
            self.rwlock.acquire_read()
            return self
        def __exit__(self, *args):
            self.rwlock.release_read()

    class _WriteContext:
        def __init__(self, rwlock):
            self.rwlock = rwlock
        def __enter__(self):
            self.rwlock.acquire_write()
            return self
        def __exit__(self, *args):
            self.rwlock.release_write()

    def read_lock(self):
        return self._ReadContext(self)

    def write_lock(self):
        return self._WriteContext(self)


_rw_lock = _RWLock()


class FileCollection:
    # 不允许通过 update 修改的字段
    IMMUTABLE_FIELDS = {'_id'}

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
        """读取数据（内部方法，需在锁保护下调用）"""
        try:
            with open(self.path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error(f'JSON corruption detected in {self.path}, attempting recovery')
            # 尝试恢复：备份损坏文件，创建空数据
            backup_path = self.path + f'.corrupted.{uuid.uuid4().hex[:8]}'
            try:
                os.rename(self.path, backup_path)
                logger.warning(f'Corrupted file backed up to {backup_path}')
            except OSError:
                pass
            return []

    def _write(self, data):
        """原子写入数据（内部方法，需在锁保护下调用）"""
        # 原子写入：先写临时文件，再 rename
        dir_name = os.path.dirname(self.path)
        try:
            fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix='.json')
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str, ensure_ascii=False)
            os.replace(tmp_path, self.path)
        except Exception:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise

    def find(self, query=None, sort=None):
        with _rw_lock.read_lock():
            items = self._read()
        if query:
            items = [i for i in items if all(i.get(k) == v for k, v in query.items())]
        if sort:
            key = sort[0][0]
            reverse = sort[0][1] < 0
            items.sort(key=lambda x: x.get(key, ''), reverse=reverse)
        return items

    def find_one(self, query):
        with _rw_lock.read_lock():
            items = self._read()
        for i in items:
            if all(i.get(k) == v for k, v in query.items()):
                return i
        return None

    def insert_one(self, doc):
        with _rw_lock.write_lock():
            items = self._read()
            items.append(doc)
            self._write(items)
        return type('Result', (), {'inserted_id': doc.get('_id', '')})()

    def update_one(self, query, update):
        # 过滤不可变字段
        set_data = update.get('$set', {})
        protected_keys = set_data.keys() & self.IMMUTABLE_FIELDS
        if protected_keys:
            logger.warning(f'Attempt to modify immutable fields {protected_keys} in {self.name}')
            set_data = {k: v for k, v in set_data.items() if k not in self.IMMUTABLE_FIELDS}

        with _rw_lock.write_lock():
            items = self._read()
            found = False
            for i in items:
                if all(i.get(k) == v for k, v in query.items()):
                    i.update(set_data)
                    found = True
                    break
            if found:
                self._write(items)
        return type('Result', (), {'modified_count': 1 if found else 0})()

    def delete_one(self, query):
        with _rw_lock.write_lock():
            items = self._read()
            for idx, item in enumerate(items):
                if all(item.get(k) == v for k, v in query.items()):
                    items.pop(idx)
                    self._write(items)
                    return type('Result', (), {'deleted_count': 1})()
        return type('Result', (), {'deleted_count': 0})()

    def delete_many(self, query):
        """删除所有匹配的文档"""
        with _rw_lock.write_lock():
            items = self._read()
            original_len = len(items)
            items = [i for i in items if not all(i.get(k) == v for k, v in query.items())]
            deleted_count = original_len - len(items)
            if deleted_count > 0:
                self._write(items)
        return type('Result', (), {'deleted_count': deleted_count})()

    def count(self, query=None):
        """统计匹配文档数"""
        with _rw_lock.read_lock():
            items = self._read()
        if query:
            items = [i for i in items if all(i.get(k) == v for k, v in query.items())]
        return len(items)


db_data = {
    'projects': FileCollection('projects'),
    'project_contents': FileCollection('project_contents'),
    'topics': FileCollection('topics'),
    'research_materials': FileCollection('research_materials'),
    'outlines': FileCollection('outlines'),
    'version_history': FileCollection('version_history'),
    'comments': FileCollection('comments'),
    'style_profiles': FileCollection('style_profiles'),
    'claims': FileCollection('claims'),
}


def create_app(config_class=Config):
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(config_class)
    CORS(app, origins=app.config['CORS_ORIGINS'])

    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    from .routes import projects, topics, research, outline, writing, review, format, ai, hotnews, workspace, style, content
    app.register_blueprint(projects.bp, url_prefix='/api/projects')
    app.register_blueprint(topics.bp, url_prefix='/api/topics')
    app.register_blueprint(research.bp, url_prefix='/api/research')
    app.register_blueprint(outline.bp, url_prefix='/api/outline')
    app.register_blueprint(writing.bp, url_prefix='/api/writing')
    app.register_blueprint(review.bp, url_prefix='/api/review')
    app.register_blueprint(format.bp, url_prefix='/api/format')
    app.register_blueprint(ai.bp, url_prefix='/api/ai')
    app.register_blueprint(hotnews.bp, url_prefix='/api/hotnews')
    app.register_blueprint(workspace.bp, url_prefix='/api/workspace')
    app.register_blueprint(style.bp, url_prefix='/api/style')
    app.register_blueprint(content.bp, url_prefix='/api/content')

    @app.route('/api/health')
    def health_check():
        llm_key = os.getenv('LLM_API_KEY', '').strip()
        base_url = os.getenv('LLM_BASE_URL', '')
        model = os.getenv('LLM_MODEL_NAME', '')
        placeholder = llm_key in ('', 'sk-your-api-key-here', 'sk-your-deepseek-key')
        return {
            'status': 'ok',
            'message': 'Article Flow API is running',
            'llm_configured': bool(llm_key) and not placeholder,
            'llm_model': model or None,
            'llm_base_url': base_url or None,
        }

    @app.before_request
    def assign_request_id():
        g.request_id = uuid.uuid4().hex[:12]

    @app.after_request
    def log_request(response):
        logger.info(f'[{g.get("request_id", "-")}] {request.method} {request.path} → {response.status_code}')
        return response

    # 统一错误处理
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': '资源不存在'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f'Internal error: {e}', exc_info=True)
        return jsonify({'error': '服务器内部错误，请稍后重试'}), 500

    return app
