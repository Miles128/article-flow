from datetime import datetime
from bson.objectid import ObjectId
from .. import db

class Project:
    collection = db.projects
    
    @classmethod
    def create(cls, title, workspace='general', target_word_count=2000):
        project = {
            'title': title,
            'workspace': workspace,
            'current_step': 1,
            'word_count': 0,
            'target_word_count': target_word_count,
            'ai_taste_score': 0,
            'status': 'draft',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'breakpoints': {
                'specification': False,
                'draft': False
            }
        }
        result = cls.collection.insert_one(project)
        project['_id'] = str(result.inserted_id)
        return project
    
    @classmethod
    def get_by_id(cls, project_id):
        project = cls.collection.find_one({'_id': ObjectId(project_id)})
        if project:
            project['_id'] = str(project['_id'])
        return project
    
    @classmethod
    def get_all(cls):
        projects = list(cls.collection.find().sort('updated_at', -1))
        for p in projects:
            p['_id'] = str(p['_id'])
        return projects
    
    @classmethod
    def update(cls, project_id, data):
        data['updated_at'] = datetime.utcnow()
        result = cls.collection.update_one(
            {'_id': ObjectId(project_id)},
            {'$set': data}
        )
        return result.modified_count > 0
    
    @classmethod
    def delete(cls, project_id):
        result = cls.collection.delete_one({'_id': ObjectId(project_id)})
        return result.deleted_count > 0


class ProjectContent:
    collection = db.project_contents
    
    @classmethod
    def create(cls, project_id, step, content_type, content):
        doc = {
            'project_id': project_id,
            'step': step,
            'content_type': content_type,
            'content': content,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = cls.collection.insert_one(doc)
        doc['_id'] = str(result.inserted_id)
        return doc
    
    @classmethod
    def get_by_project_step(cls, project_id, step):
        contents = list(cls.collection.find({'project_id': project_id, 'step': step}))
        for c in contents:
            c['_id'] = str(c['_id'])
        return contents
    
    @classmethod
    def update(cls, content_id, content):
        result = cls.collection.update_one(
            {'_id': ObjectId(content_id)},
            {'$set': {'content': content, 'updated_at': datetime.utcnow()}}
        )
        return result.modified_count > 0


class Topic:
    collection = db.topics
    
    @classmethod
    def create(cls, project_id, title, description='', tags=None, priority=1):
        topic = {
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
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = cls.collection.insert_one(topic)
        topic['_id'] = str(result.inserted_id)
        return topic
    
    @classmethod
    def get_by_project(cls, project_id):
        topics = list(cls.collection.find({'project_id': project_id}).sort('priority', -1))
        for t in topics:
            t['_id'] = str(t['_id'])
        return topics
    
    @classmethod
    def update(cls, topic_id, data):
        data['updated_at'] = datetime.utcnow()
        result = cls.collection.update_one(
            {'_id': ObjectId(topic_id)},
            {'$set': data}
        )
        return result.modified_count > 0


class ResearchMaterial:
    collection = db.research_materials
    
    @classmethod
    def create(cls, project_id, source_type, source_url, title, content, summary='', keywords=None):
        material = {
            'project_id': project_id,
            'source_type': source_type,
            'source_url': source_url,
            'title': title,
            'content': content,
            'summary': summary,
            'keywords': keywords or [],
            'citation': '',
            'created_at': datetime.utcnow()
        }
        result = cls.collection.insert_one(material)
        material['_id'] = str(result.inserted_id)
        return material
    
    @classmethod
    def get_by_project(cls, project_id):
        materials = list(cls.collection.find({'project_id': project_id}).sort('created_at', -1))
        for m in materials:
            m['_id'] = str(m['_id'])
        return materials


class Outline:
    collection = db.outlines
    
    @classmethod
    def create(cls, project_id, title, nodes=None):
        outline = {
            'project_id': project_id,
            'title': title,
            'nodes': nodes or [],
            'version': 1,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = cls.collection.insert_one(outline)
        outline['_id'] = str(result.inserted_id)
        return outline
    
    @classmethod
    def get_by_project(cls, project_id):
        outline = cls.collection.find_one({'project_id': project_id})
        if outline:
            outline['_id'] = str(outline['_id'])
        return outline


class VersionHistory:
    collection = db.version_history
    
    @classmethod
    def create(cls, project_id, step, content, version_number, note=''):
        version = {
            'project_id': project_id,
            'step': step,
            'content': content,
            'version_number': version_number,
            'note': note,
            'created_at': datetime.utcnow()
        }
        result = cls.collection.insert_one(version)
        version['_id'] = str(result.inserted_id)
        return version
    
    @classmethod
    def get_by_project_step(cls, project_id, step):
        versions = list(cls.collection.find(
            {'project_id': project_id, 'step': step}
        ).sort('version_number', -1))
        for v in versions:
            v['_id'] = str(v['_id'])
        return versions
