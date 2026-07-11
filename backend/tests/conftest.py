"""pytest 共用 fixture：隔离 DATA_DIR，避免污染 backend/data。"""
from __future__ import annotations

import os

import pytest


@pytest.fixture()
def app(tmp_path, monkeypatch):
    data_dir = tmp_path / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv('ARTICLE_FLOW_DATA_DIR', str(data_dir))

    import app as app_module

    monkeypatch.setattr(app_module, 'DATA_DIR', str(data_dir))
    for coll in app_module.db_data.values():
        coll.path = os.path.join(str(data_dir), f'{coll.name}.json')
        coll._ensure_file()

    flask_app = app_module.create_app()
    flask_app.config['TESTING'] = True
    return flask_app


@pytest.fixture()
def client(app):
    return app.test_client()
