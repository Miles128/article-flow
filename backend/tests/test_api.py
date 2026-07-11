"""API 集成测试 — Flask Test Client 覆盖核心路由 happy path。

所有测试不依赖 LLM（不调用需要 @with_llm 装饰器的端点）。
DATA_DIR 由 conftest 隔离到临时目录，不污染 backend/data。

注意：Flask test client 不经过 axios 拦截器，请求/响应全部使用 snake_case。
"""

import os

os.environ.setdefault("FLASK_DEBUG", "0")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

# app / client fixtures 见 tests/conftest.py（隔离临时 DATA_DIR）


# ───────────────────── Health ─────────────────────

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"
    assert "llm_base_url" not in data


def test_rewrite_requires_style(client):
    """rewrite 路由应能加载 transform_preserving_title（非 NameError）"""
    resp = client.post("/api/writing/rewrite", json={"content": "测试正文"})
    assert resp.status_code == 400
    assert "style" in (resp.get_json() or {}).get("error", "").lower()


def test_ai_stream_unknown_action(client):
    resp = client.post("/api/writing/ai-stream", json={"action": "nope", "content": "x"})
    assert resp.status_code == 400


# ───────────────────── Projects CRUD ─────────────────────

def test_projects_crud(client):
    resp = client.post("/api/projects", json={
        "title": "测试项目",
        "workspace": "general",
        "target_word_count": 2000,
        "content_type": "article",
    })
    assert resp.status_code == 201
    project = resp.get_json()
    assert project["title"] == "测试项目"
    assert project["status"] == "draft"
    assert "_id" in project
    pid = project["_id"]

    resp = client.get("/api/projects")
    assert resp.status_code == 200
    assert any(p["_id"] == pid for p in resp.get_json())

    resp = client.get(f"/api/projects/{pid}")
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "测试项目"

    resp = client.patch(f"/api/projects/{pid}", json={"title": "修改后的项目"})
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "修改后的项目"

    resp = client.delete(f"/api/projects/{pid}")
    assert resp.status_code == 200
    resp = client.get(f"/api/projects/{pid}")
    assert resp.status_code == 404


def test_create_project_defaults(client):
    resp = client.post("/api/projects", json={"title": "默认项目"})
    assert resp.status_code == 201
    p = resp.get_json()
    assert p["current_step"] == 1
    assert p["target_word_count"] == 2000
    assert p["workflow_version"] == 2


def test_create_project_with_content_type(client):
    for ct in ["article", "script", "general"]:
        resp = client.post("/api/projects", json={
            "title": f"{ct} 项目",
            "content_type": ct,
        })
        assert resp.status_code == 201
        assert resp.get_json()["content_type"] == ct


def test_create_project_empty_title(client):
    resp = client.post("/api/projects", json={"title": ""})
    # Backend accepts empty-title projects (no server-side validation)
    assert resp.status_code == 201


def test_update_nonexistent_project(client):
    resp = client.patch("/api/projects/nonexistent", json={"title": "x"})
    assert resp.status_code == 404


# ───────────────────── Project Contents ─────────────────────

def test_project_contents_crud(client):
    resp = client.post("/api/projects", json={"title": "内容测试"})
    pid = resp.get_json()["_id"]

    resp = client.post(f"/api/projects/{pid}/contents", json={
        "step": 5,
        "content": "# 测试文章\n\n正文内容",
        "content_type": "markdown",
    })
    assert resp.status_code == 201
    content = resp.get_json()
    assert content["step"] == 5
    content_id = content["_id"]

    resp = client.get(f"/api/projects/{pid}/contents")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1

    resp = client.get(f"/api/projects/{pid}/contents", query_string={"step": 5})
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1

    resp = client.get(f"/api/projects/{pid}/contents", query_string={"step": 1})
    assert resp.status_code == 200
    assert len(resp.get_json()) == 0

    resp = client.put(f"/api/projects/{pid}/contents/{content_id}", json={
        "content": "# 测试文章\n\n修改后的内容",
    })
    assert resp.status_code == 200

    client.delete(f"/api/projects/{pid}")


# ───────────────────── Topics Flow ─────────────────────

def test_topics_crud(client):
    resp = client.post("/api/projects", json={"title": "选题测试项目"})
    pid = resp.get_json()["_id"]

    resp = client.post("/api/topics", json={
        "project_id": pid,
        "title": "测试选题",
        "description": "这是一个测试选题",
        "tags": ["科技", "AI"],
        "priority": 3,
    })
    assert resp.status_code == 201
    topic = resp.get_json()
    assert topic["title"] == "测试选题"
    assert topic["status"] == "pending"
    tid = topic["_id"]

    resp = client.get("/api/topics", query_string={"project_id": pid})
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1

    resp = client.patch(f"/api/topics/{tid}", json={"status": "selected"})
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "selected"

    resp = client.delete(f"/api/topics/{tid}")
    assert resp.status_code == 200

    resp = client.get("/api/topics", query_string={"project_id": pid})
    assert len(resp.get_json()) == 0

    client.delete(f"/api/projects/{pid}")


def test_topics_missing_project_id(client):
    resp = client.post("/api/topics", json={"title": "无归属"})
    assert resp.status_code == 400


# ───────────────────── Outline Flow ─────────────────────

def test_outline_crud(client):
    resp = client.post("/api/projects", json={"title": "大纲测试"})
    pid = resp.get_json()["_id"]

    nodes = [
        {"id": "s1", "title": "引言", "sectionType": "info"},
        {"id": "s2", "title": "正文", "sectionType": "info", "children": [
            {"id": "s2a", "title": "小节1"},
            {"id": "s2b", "title": "小节2"},
        ]},
        {"id": "s3", "title": "总结", "sectionType": "experience"},
    ]
    resp = client.post("/api/outline", json={
        "project_id": pid,
        "title": "测试大纲",
        "nodes": nodes,
    })
    # create_or_update returns 200 on update, 201 on create — both OK
    assert resp.status_code in (200, 201)
    outline = resp.get_json()
    assert outline["title"] == "测试大纲"
    assert len(outline["nodes"]) == 3

    resp = client.get("/api/outline", query_string={"project_id": pid})
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "测试大纲"

    resp = client.post("/api/outline", json={
        "project_id": pid,
        "title": "更新后大纲",
        "nodes": nodes[:2],
    })
    assert resp.status_code in (200, 201)
    assert resp.get_json()["title"] == "更新后大纲"

    resp = client.get("/api/outline/templates")
    assert resp.status_code == 200

    client.delete(f"/api/projects/{pid}")


# ───────────────────── Writing Endpoints (non-LLM) ─────────────────────

def test_writing_modes(client):
    resp = client.get("/api/writing/modes")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "modes" in data
    modes = data["modes"]
    assert len(modes) >= 4
    mode_ids = [m["id"] for m in modes]
    assert "coach" in mode_ids
    assert "fast" in mode_ids


def test_writing_styles(client):
    resp = client.get("/api/writing/styles")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["default"] == "professional"
    assert any(s["id"] == "casual" for s in data["styles"])


def test_scan_ai_rules(client):
    content = "在当今AI技术飞速发展的今天，综上所述，我们可以认为这个工具显著提升了效率。"
    resp = client.post("/api/writing/scan-ai-rules", json={"content": content})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "score" in data
    assert "matches" in data
    assert data["match_count"] > 0 or data["score"] > 0


def test_scan_ai_rules_clean_content(client):
    content = "昨天我试了Claude Code。确实好用。代码快了40%，bug少了30%。"
    resp = client.post("/api/writing/scan-ai-rules", json={"content": content})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "score" in data
    assert isinstance(data["score"], (int, float))


def test_fix_ai_rules(client):
    content = "在当今数字化浪潮中，这个系统显著提升了效率，充分利用了AI技术。"
    resp = client.post("/api/writing/fix-ai-rules", json={"content": content})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "fixed_content" in data
    assert "before_score" in data
    assert "after_score" in data


def test_anti_ai_rules_config(client):
    resp = client.get("/api/writing/anti-ai-rules")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "target_score" in data


def test_scan_ai_rules_no_content(client):
    resp = client.post("/api/writing/scan-ai-rules", json={})
    assert resp.status_code == 400


# ───────────────────── Format Endpoints (non-LLM) ─────────────────────

def test_get_platforms(client):
    resp = client.get("/api/format/platforms")
    assert resp.status_code == 200
    platforms = resp.get_json()
    assert isinstance(platforms, list)
    assert len(platforms) >= 6
    platform_ids = [p["id"] for p in platforms]
    assert "wechat" in platform_ids
    assert "zhihu" in platform_ids


def test_export_plaintext(client):
    md = "# 标题\n\n这是一段**加粗**文字。\n\n- 列表项1\n- 列表项2"
    resp = client.post("/api/format/export", json={
        "content": md,
        "format": "plaintext",
        "title": "Test",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["format"] == "plaintext"
    assert "标题" in data["content"]
    assert "加粗" in data["content"]


def test_export_html(client):
    md = "# Hello\n\nWorld"
    resp = client.post("/api/format/export", json={
        "content": md,
        "format": "html",
        "title": "Test",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["format"] == "html"
    # markdown.markdown with codehilite extension emits id attr: <h1 id="hello">
    assert "Hello" in data["content"]


def test_export_invalid_format(client):
    resp = client.post("/api/format/export", json={
        "content": "test",
        "format": "invalid-xyz",
    })
    assert resp.status_code == 400


def test_inline_css(client):
    html = '<p class="red">Hello</p>'
    css = ".red { color: red; }"
    resp = client.post("/api/format/inline-css", json={"html": html, "css": css})
    assert resp.status_code == 200
    data = resp.get_json()
    assert "inlined_html" in data
    assert "color" in data["inlined_html"].lower() or "red" in data["inlined_html"]


def test_inline_css_missing_fields(client):
    resp = client.post("/api/format/inline-css", json={"html": "<p>x</p>"})
    assert resp.status_code == 400


# ───────────────────── Review Endpoints (non-LLM) ─────────────────────

def test_get_review_passes(client):
    resp = client.get("/api/review/review-passes")
    assert resp.status_code == 200
    data = resp.get_json()
    passes = data["passes"]
    pass_ids = [p["id"] for p in passes]
    assert "content" in pass_ids
    assert "style" in pass_ids
    assert "detail" in pass_ids


def test_review_comments_crud(client):
    resp = client.post("/api/projects", json={"title": "审校测试"})
    pid = resp.get_json()["_id"]

    resp = client.post("/api/review/comments", json={
        "project_id": pid,
        "content": "这里需要修改措辞",
        "author": "测试者",
        "step": 7,
        "selection": "需要改的部分",
    })
    assert resp.status_code == 201
    comment = resp.get_json()
    assert comment["content"] == "这里需要修改措辞"
    cid = comment["_id"]

    resp = client.get("/api/review/comments", query_string={"project_id": pid})
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1

    resp = client.put(f"/api/review/comments/{cid}", json={
        "resolved": True,
        "content": "已解决",
    })
    assert resp.status_code == 200

    resp = client.delete(f"/api/review/comments/{cid}")
    assert resp.status_code == 200

    client.delete(f"/api/projects/{pid}")


# ───────────────────── HotNews Endpoints ─────────────────────

def test_hotnews_categories(client):
    resp = client.get("/api/hotnews/categories")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, (dict, list))


# ───────────────────── AI Endpoints (non-LLM) ─────────────────────

def test_ai_config(client):
    resp = client.get("/api/ai/config")
    assert resp.status_code == 200


# ───────────────────── Edge Cases ─────────────────────

def test_404_on_nonexistent_route(client):
    resp = client.get("/api/nonexistent")
    assert resp.status_code == 404


def test_project_cascade_delete(client):
    resp = client.post("/api/projects", json={"title": "级联删除测试"})
    pid = resp.get_json()["_id"]

    client.post("/api/topics", json={"project_id": pid, "title": "选题"})
    client.post("/api/outline", json={"project_id": pid, "title": "大纲", "nodes": []})
    client.post(f"/api/projects/{pid}/contents", json={
        "step": 5, "content": "内容", "content_type": "markdown",
    })
    client.post("/api/review/comments", json={"project_id": pid, "content": "评论"})

    assert len(client.get("/api/topics", query_string={"project_id": pid}).get_json()) == 1
    assert client.get("/api/outline", query_string={"project_id": pid}).status_code == 200

    client.delete(f"/api/projects/{pid}")

    assert len(client.get("/api/topics", query_string={"project_id": pid}).get_json()) == 0
    # After cascade delete, outline returns {} (not None — the route returns jsonify({}))
    after_delete = client.get("/api/outline", query_string={"project_id": pid}).get_json()
    assert after_delete == {} or after_delete is None


def test_content_persistence(client):
    resp = client.post("/api/projects", json={"title": "持久化测试"})
    pid = resp.get_json()["_id"]

    content_body = "# 长篇内容\n\n" + "测试段落。\n" * 20
    resp = client.post(f"/api/projects/{pid}/contents", json={
        "step": 5, "content": content_body, "content_type": "markdown",
    })
    cid = resp.get_json()["_id"]

    resp = client.get(f"/api/projects/{pid}/contents", query_string={"step": 5})
    saved = resp.get_json()[0]
    assert saved["content"] == content_body
    assert saved["_id"] == cid

    client.delete(f"/api/projects/{pid}")
