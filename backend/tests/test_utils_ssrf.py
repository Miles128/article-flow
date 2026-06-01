"""SSRF 防护单测"""
from __future__ import annotations

import socket
from unittest.mock import patch

from app.utils_ssrf import validate_url


def test_blocks_private_ip_literal():
    ok, msg = validate_url('http://127.0.0.1/secret')
    assert not ok
    assert '内部' in msg or '不允许' in msg


def test_blocks_metadata_host():
    ok, msg = validate_url('http://169.254.169.254/latest/meta-data/')
    assert not ok


def test_blocks_non_http_scheme():
    ok, msg = validate_url('file:///etc/passwd')
    assert not ok
    assert 'http' in msg


def test_allows_public_https():
    with patch(
        'socket.getaddrinfo',
        return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34', 0)),
        ],
    ):
        ok, msg = validate_url('https://example.com/article')
    assert ok, msg


def test_dns_private_ip_rejected():
    with patch(
        'socket.getaddrinfo',
        return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('10.0.0.1', 0)),
        ],
    ):
        ok, msg = validate_url('https://evil.example/')
    assert not ok
