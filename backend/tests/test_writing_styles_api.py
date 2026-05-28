def test_get_writing_styles_route(client):
    resp = client.get('/api/writing/styles')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['default'] == 'professional'
    assert any(s['id'] == 'professional' for s in data['styles'])
