"""数据模型层 - 富领域模型"""
import uuid
from datetime import datetime, timezone
from .. import db_data as db


def _gen_id():
    return str(uuid.uuid4())


def _now():
    """返回 UTC ISO 格式时间戳（替代已弃用的 datetime.utcnow()）"""
    return datetime.now(timezone.utc).isoformat()


def _validate_word_count(count):
    """验证目标字数"""
    if count is not None:
        count = max(100, min(count, 100000))  # 限制在 100-100000
    return count


class Project:
    @classmethod
    def create(cls, title, workspace='general', target_word_count=2000, content_type='article'):
        target_word_count = _validate_word_count(target_word_count)
        if content_type not in ('script', 'article', 'general'):
            content_type = 'article'
        project = {
            '_id': _gen_id(),
            'title': title,
            'workspace': workspace,
            'content_type': content_type,
            'current_step': 1,
            'word_count': 0,
            'target_word_count': target_word_count,
            'ai_taste_score': 0,
            'status': 'draft',
            'created_at': _now(),
            'updated_at': _now(),
            'style_profile_id': None,
            'selected_title': '',
            'cover_line': '',
            'workflow_version': 2,
            'breakpoints': {
                'specification': False,
                'draft': False
            }
        }
        db['projects'].insert_one(project)
        return project

    @classmethod
    def get_by_id(cls, project_id):
        return db['projects'].find_one({'_id': project_id})

    @classmethod
    def get_all(cls):
        return db['projects'].find(sort=[('updated_at', -1)])

    @classmethod
    def update(cls, project_id, data):
        data['updated_at'] = _now()
        # 过滤不可变字段
        data.pop('_id', None)
        result = db['projects'].update_one({'_id': project_id}, {'$set': data})
        return result.modified_count > 0

    @classmethod
    def delete(cls, project_id):
        """删除项目及其所有关联数据（聚合根级联删除）"""
        # 级联删除关联数据
        Topic.delete_by_project(project_id)
        ResearchMaterial.delete_by_project(project_id)
        Claim.delete_by_project(project_id)
        Outline.delete_by_project(project_id)
        Comment.delete_by_project(project_id)
        ProjectContent.delete_by_project(project_id)
        VersionHistory.delete_by_project(project_id)
        # 删除项目本身
        result = db['projects'].delete_one({'_id': project_id})
        return result.deleted_count > 0


class ProjectContent:
    @classmethod
    def create(cls, project_id, step, content_type, content):
        doc = {
            '_id': _gen_id(),
            'project_id': project_id,
            'step': step,
            'content_type': content_type,
            'content': content,
            'created_at': _now(),
            'updated_at': _now()
        }
        db['project_contents'].insert_one(doc)
        return doc

    @classmethod
    def get_by_project_step(cls, project_id, step):
        return db['project_contents'].find({'project_id': project_id, 'step': step})

    @classmethod
    def update(cls, content_id, content):
        result = db['project_contents'].update_one(
            {'_id': content_id},
            {'$set': {'content': content, 'updated_at': _now()}}
        )
        return result.modified_count > 0

    @classmethod
    def get_latest_content(cls, project_id: str, step: int = 5) -> str:
        items = list(cls.get_by_project_step(project_id, step))
        if not items:
            return ''
        latest = max(items, key=lambda x: x.get('updated_at', x.get('created_at', '')))
        return (latest.get('content') or '').strip()

    @classmethod
    def delete_by_project(cls, project_id):
        return db['project_contents'].delete_many({'project_id': project_id})


class Topic:
    @classmethod
    def create(cls, project_id, title, description='', tags=None, priority=1):
        topic = {
            '_id': _gen_id(),
            'project_id': project_id,
            'title': title,
            'description': description,
            'tags': tags or [],
            'priority': priority,
            'status': 'pending',
            'evaluation': {
                'trend_score': 0,
                'competition_score': 0,
                'audience_score': 0,
                'overall_score': 0
            },
            'created_at': _now(),
            'updated_at': _now()
        }
        db['topics'].insert_one(topic)
        return topic

    @classmethod
    def get_by_project(cls, project_id):
        items = db['topics'].find({'project_id': project_id})
        items.sort(key=lambda x: x.get('priority', 0), reverse=True)
        return items

    @classmethod
    def update(cls, topic_id, data):
        data['updated_at'] = _now()
        data.pop('_id', None)
        result = db['topics'].update_one({'_id': topic_id}, {'$set': data})
        return result.modified_count > 0

    @classmethod
    def get_by_id(cls, topic_id):
        return db['topics'].find_one({'_id': topic_id})

    @classmethod
    def delete(cls, topic_id):
        result = db['topics'].delete_one({'_id': topic_id})
        return result.deleted_count > 0

    @classmethod
    def delete_by_project(cls, project_id):
        return db['topics'].delete_many({'project_id': project_id})


class ResearchMaterial:
    @classmethod
    def create(cls, project_id, source_type, source_url, title, content, summary='', keywords=None):
        material = {
            '_id': _gen_id(),
            'project_id': project_id,
            'source_type': source_type,
            'source_url': source_url,
            'title': title,
            'content': content,
            'summary': summary,
            'keywords': keywords or [],
            'citation': '',
            'created_at': _now()
        }
        db['research_materials'].insert_one(material)
        return material

    @classmethod
    def get_by_project(cls, project_id):
        items = db['research_materials'].find({'project_id': project_id})
        items.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return items

    @classmethod
    def delete(cls, material_id):
        result = db['research_materials'].delete_one({'_id': material_id})
        return result.deleted_count > 0

    @classmethod
    def delete_by_project(cls, project_id):
        return db['research_materials'].delete_many({'project_id': project_id})

    @classmethod
    def update(cls, material_id, data):
        data.pop('_id', None)
        result = db['research_materials'].update_one({'_id': material_id}, {'$set': data})
        return result.modified_count > 0


class Claim:
    @classmethod
    def create(cls, project_id, text, material_id='', source_quote='', verified=False):
        claim = {
            '_id': _gen_id(),
            'project_id': project_id,
            'text': text,
            'material_id': material_id,
            'source_quote': source_quote,
            'verified': verified,
            'created_at': _now(),
        }
        db['claims'].insert_one(claim)
        return claim

    @classmethod
    def get_by_project(cls, project_id):
        items = db['claims'].find({'project_id': project_id})
        items.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return items

    @classmethod
    def delete(cls, claim_id):
        result = db['claims'].delete_one({'_id': claim_id})
        return result.deleted_count > 0

    @classmethod
    def delete_by_project(cls, project_id):
        return db['claims'].delete_many({'project_id': project_id})

    @classmethod
    def update(cls, claim_id, data):
        data.pop('_id', None)
        result = db['claims'].update_one({'_id': claim_id}, {'$set': data})
        return result.modified_count > 0


class Outline:
    @classmethod
    def create(cls, project_id, title, nodes=None):
        outline = {
            '_id': _gen_id(),
            'project_id': project_id,
            'title': title,
            'nodes': nodes or [],
            'version': 1,
            'created_at': _now(),
            'updated_at': _now()
        }
        db['outlines'].insert_one(outline)
        return outline

    @classmethod
    def get_by_project(cls, project_id):
        return db['outlines'].find_one({'project_id': project_id})

    @classmethod
    def create_or_update(cls, project_id, data):
        existing = db['outlines'].find_one({'project_id': project_id})
        if existing:
            data['updated_at'] = _now()
            data.pop('_id', None)
            db['outlines'].update_one({'project_id': project_id}, {'$set': data})
            return db['outlines'].find_one({'project_id': project_id})
        else:
            return cls.create(project_id, data.get('title', ''), data.get('nodes', []))

    @classmethod
    def delete_by_project(cls, project_id):
        return db['outlines'].delete_many({'project_id': project_id})


class VersionHistory:
    @classmethod
    def create(cls, project_id, step, content, version_number, note=''):
        version = {
            '_id': _gen_id(),
            'project_id': project_id,
            'step': step,
            'content': content,
            'version_number': version_number,
            'note': note,
            'created_at': _now()
        }
        db['version_history'].insert_one(version)
        return version

    @classmethod
    def get_by_project_step(cls, project_id, step):
        items = db['version_history'].find({'project_id': project_id, 'step': step})
        items.sort(key=lambda x: x.get('version_number', 0), reverse=True)
        return items

    @classmethod
    def delete_by_project(cls, project_id):
        return db['version_history'].delete_many({'project_id': project_id})


class Comment:
    @classmethod
    def create(cls, project_id, content, author='匿名', step=None, position=None, selection=None):
        comment = {
            '_id': _gen_id(),
            'project_id': project_id,
            'step': step,
            'position': position,
            'selection': selection,
            'content': content,
            'author': author,
            'resolved': False,
            'replies': [],
            'created_at': _now()
        }
        db['comments'].insert_one(comment)
        return comment

    @classmethod
    def get_by_project(cls, project_id):
        comments = db['comments'].find({'project_id': project_id})
        comments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return comments

    @classmethod
    def get_by_id(cls, comment_id):
        return db['comments'].find_one({'_id': comment_id})

    @classmethod
    def update(cls, comment_id, data):
        data.pop('_id', None)
        result = db['comments'].update_one({'_id': comment_id}, {'$set': data})
        return result.modified_count > 0

    @classmethod
    def add_reply(cls, comment_id, content, author='匿名'):
        reply = {
            'content': content,
            'author': author,
            'created_at': _now()
        }
        # 通过 FileCollection 的 update_one 做追加：读→追加→原子写
        comment = db['comments'].find_one({'_id': comment_id})
        if comment:
            replies = comment.get('replies', [])
            replies.append(reply)
            db['comments'].update_one({'_id': comment_id}, {'$set': {'replies': replies}})
            return comment
        return None

    @classmethod
    def delete(cls, comment_id):
        result = db['comments'].delete_one({'_id': comment_id})
        return result.deleted_count > 0

    @classmethod
    def delete_by_project(cls, project_id):
        return db['comments'].delete_many({'project_id': project_id})
