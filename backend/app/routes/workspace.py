"""工作区路由 - 使用配置外部化"""
from flask import Blueprint, jsonify
from ..config_loader import get_workspaces

bp = Blueprint('workspace', __name__)

# 从配置加载工作区数据
_WORKSPACES_CACHE = None


def _get_workspaces_dict():
    global _WORKSPACES_CACHE
    if _WORKSPACES_CACHE is None:
        ws_list = get_workspaces()
        _WORKSPACES_CACHE = {ws['id']: ws for ws in ws_list}
    return _WORKSPACES_CACHE


@bp.route('', methods=['GET'])
def list_workspaces():
    workspaces = get_workspaces()
    return jsonify({'workspaces': workspaces})


@bp.route('/<workspace_id>', methods=['GET'])
def get_workspace(workspace_id):
    ws_dict = _get_workspaces_dict()
    ws = ws_dict.get(workspace_id)
    if not ws:
        return jsonify({'error': 'Workspace not found'}), 404
    return jsonify(ws)


@bp.route('/<workspace_id>/rules', methods=['GET'])
def get_workspace_rules(workspace_id):
    ws_dict = _get_workspaces_dict()
    ws = ws_dict.get(workspace_id)
    if not ws:
        return jsonify({'error': 'Workspace not found'}), 404
    return jsonify({'rules': ws.get('rules', {})})
