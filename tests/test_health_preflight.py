from fastapi.testclient import TestClient
from repoguide_api.main import app
client = TestClient(app)
def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
def test_preflight_demo_repo():
    r = client.post("/preflight", json={"path": "/app/src/demo_repo"})
    assert r.status_code == 200
    j = r.json()
    assert j["path"].endswith("/demo_repo")
    assert "summary" in j
