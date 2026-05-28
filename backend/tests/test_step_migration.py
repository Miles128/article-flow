"""工作流步骤迁移单元测试"""
from app.services.step_migration import migrate_article_step, WORKFLOW_VERSION


def test_step6_without_titles_becomes_review():
    p = {'_id': 'p1', 'current_step': 6, 'selected_title': ''}
    assert migrate_article_step(p) == 7


def test_step6_with_selected_title_stays():
    p = {'_id': 'p1', 'current_step': 6, 'selected_title': '标题'}
    assert migrate_article_step(p) == 6


def test_step7_without_titles_was_old_format():
    p = {'_id': 'p1', 'current_step': 7, 'selected_title': ''}
    assert migrate_article_step(p) == 8


def test_step7_with_titles_is_new_review():
    p = {'_id': 'p1', 'current_step': 7, 'selected_title': '标题'}
    assert migrate_article_step(p) == 7


def test_workflow_version_constant():
    assert WORKFLOW_VERSION == 2
