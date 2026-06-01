import os
from dotenv import load_dotenv

_BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(_BACKEND_DIR, '.env'))


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # LLM 配置
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    ZHIPU_API_KEY = os.getenv('ZHIPU_API_KEY', '')
    
    DEFAULT_MODEL_PROVIDER = os.getenv('DEFAULT_MODEL_PROVIDER', 'openai')
    DEFAULT_MODEL_NAME = os.getenv('DEFAULT_MODEL_NAME', 'gpt-4o-mini')
    
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')
    
    HOTNEWS_SOURCES = os.getenv('HOTNEWS_SOURCES', 'weibo,zhihu,bilibili').split(',')
    
    # 安全配置
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 500000))  # 最大内容长度
    LLM_REQUEST_TIMEOUT = int(os.getenv('LLM_REQUEST_TIMEOUT', 120))  # LLM 请求超时（秒）
