"""SSRF 防护工具模块"""
import ipaddress
import socket
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# 云元数据端点
BLOCKED_HOSTS = {
    '127.0.0.1', 'localhost', '0.0.0.0', '::1',
    '169.254.169.254',  # AWS/GCP/Azure 元数据
    'metadata.google.internal',
    '100.100.100.200',  # 阿里云元数据
}

# 私有网段
PRIVATE_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),      # 172.16.0.0 - 172.31.255.255
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),      # 链路本地
    ipaddress.ip_network('fc00::/7'),            # IPv6 唯一本地
    ipaddress.ip_network('fe80::/10'),           # IPv6 链路本地
    ipaddress.ip_network('::1/128'),             # IPv6 回环
]


def _is_private_ip(ip_str: str) -> bool:
    """检查 IP 是否属于私有网段"""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in PRIVATE_NETWORKS)
    except ValueError:
        return False


def validate_url(url: str) -> tuple[bool, str]:
    """
    验证 URL 是否安全（防止 SSRF 攻击）
    返回 (is_safe, error_message)
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return False, '无效的 URL 格式'

    # 只允许 http/https
    if parsed.scheme not in ('http', 'https'):
        return False, '只允许 http/https 协议'

    hostname = parsed.hostname or ''

    # 检查已知黑名单
    if hostname.lower() in BLOCKED_HOSTS:
        return False, '不允许访问内部地址'

    # DNS 解析后检查实际 IP
    try:
        resolved_ips = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for family, _, _, _, sockaddr in resolved_ips:
            ip_str = sockaddr[0]
            if _is_private_ip(ip_str):
                return False, '不允许访问内部地址'
    except socket.gaierror:
        return False, '域名解析失败'

    return True, ''


def get_safe_request_kwargs(url: str, timeout: int = 15) -> dict:
    """
    获取安全的 requests 请求参数
    禁止跟随重定向，限制响应大小
    """
    return {
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        'timeout': timeout,
        'allow_redirects': False,  # 禁止自动跟随重定向
        'stream': True,            # 流式读取，便于限制大小
    }


def fetch_url_safely(url: str, max_size: int = 5 * 1024 * 1024) -> tuple[bool, str, str]:
    """
    安全抓取 URL 内容
    返回 (success, content_or_error, resolved_url)
    """
    import requests as req_lib

    # 验证 URL
    is_safe, error = validate_url(url)
    if not is_safe:
        return False, error, url

    kwargs = get_safe_request_kwargs(url)

    try:
        response = req_lib.get(url, **kwargs)

        # 手动处理重定向（最多 3 次）
        max_redirects = 3
        redirect_count = 0
        while response.is_redirect and redirect_count < max_redirects:
            redirect_url = response.headers.get('Location', '')
            if not redirect_url:
                break
            is_safe, error = validate_url(redirect_url)
            if not is_safe:
                return False, f'重定向到不允许的地址: {error}', url
            response = req_lib.get(redirect_url, **kwargs)
            redirect_count += 1

        if response.is_redirect:
            return False, '重定向次数过多', url

        # 限制响应大小
        content_chunks = []
        total_size = 0
        for chunk in response.iter_content(chunk_size=8192, decode_unicode=True):
            total_size += len(chunk)
            if total_size > max_size:
                return False, '响应内容过大', url
            content_chunks.append(chunk)

        content = ''.join(content_chunks)
        return True, content, response.url

    except req_lib.RequestException as e:
        logger.warning(f'URL fetch failed for {url}: {e}')
        return False, f'抓取失败: {str(e)}', url
