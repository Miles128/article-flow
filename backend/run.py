import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', '5001'))
    if host in ('0.0.0.0', '::') and os.getenv('ARTICLE_FLOW_ALLOW_LAN', '').strip().lower() not in (
        '1',
        'true',
        'yes',
    ):
        import sys

        print(
            '警告: FLASK_HOST=0.0.0.0 将暴露无鉴权 API 到局域网。'
            '本地使用请保持 127.0.0.1，或设置 ARTICLE_FLOW_ALLOW_LAN=1。',
            file=sys.stderr,
        )
    app.run(debug=debug, host=host, port=port, threaded=True)
