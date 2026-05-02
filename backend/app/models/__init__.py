import uuid
from datetime import datetime
from .. import db_data as db


def _gen_id():
    return str(uuid.uuid4())


class Project:
    @classmethod
    def create(cls, title, workspace='general', target_word_count=2000):
        project = {
            '_id': _gen_id(),
            'title': title,
            'workspace': workspace,
            'current_step': 1,
            'word_count': 0,
            'target_word_count': target_word_count,
            'ai_taste_score': 0,
            'status': 'draft',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
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
        data['updated_at'] = datetime.utcnow().isoformat()
        result = db['projects'].update_one({'_id': project_id}, {'$set': data})
        return result.modified_count > 0

    @classmethod
    def delete(cls, project_id):
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
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
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
            {'$set': {'content': content, 'updated_at': datetime.utcnow().isoformat()}}
        )
        return result.modified_count > 0


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
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
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
        data['updated_at'] = datetime.utcnow().isoformat()
        result = db['topics'].update_one({'_id': topic_id}, {'$set': data})
        return result.modified_count > 0


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
            'created_at': datetime.utcnow().isoformat()
        }
        db['research_materials'].insert_one(material)
        return material

    @classmethod
    def get_by_project(cls, project_id):
        items = db['research_materials'].find({'project_id': project_id})
        items.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return items


class Outline:
    @classmethod
    def create(cls, project_id, title, nodes=None):
        outline = {
            '_id': _gen_id(),
            'project_id': project_id,
            'title': title,
            'nodes': nodes or [],
            'version': 1,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        db['outlines'].insert_one(outline)
        return outline

    @classmethod
    def get_by_project(cls, project_id):
        return db['outlines'].find_one({'project_id': project_id})


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
            'created_at': datetime.utcnow().isoformat()
        }
        db['version_history'].insert_one(version)
        return version

    @classmethod
    def get_by_project_step(cls, project_id, step):
        items = db['version_history'].find({'project_id': project_id, 'step': step})
        items.sort(key=lambda x: x.get('version_number', 0), reverse=True)
        return items
