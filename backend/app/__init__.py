from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from .config import Config

db = None

def create_app(config_class=Config):
    global db
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    mongo_client = MongoClient(app.config['MONGODB_URI'])
    db = mongo_client[app.config['MONGODB_DB']]
    
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
