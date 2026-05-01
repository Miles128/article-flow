import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    MONGODB_DB = os.getenv('MONGODB_DB', 'article_flow')
    
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    ZHIPU_API_KEY = os.getenv('ZHIPU_API_KEY', '')
    
    DEFAULT_MODEL_PROVIDER = os.getenv('DEFAULT_MODEL_PROVIDER', 'openai')
    DEFAULT_MODEL_NAME = os.getenv('DEFAULT_MODEL_NAME', 'gpt-4-turbo-preview')
    
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    HOTNEWS_SOURCES = os.getenv('HOTNEWS_SOURCES', 'weibo,zhihu,bilibili').split(',')
