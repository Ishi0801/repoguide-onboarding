import os, uuid, httpx, pytest
from fastapi.testclient import TestClient
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

from repoguide_api.main import app
from repoguide_retriever import hybrid as retr

REQUIRED = ["AZURE_OPENAI_ENDPOINT","AZURE_OPENAI_API_KEY","AZURE_OPENAI_API_VERSION","AZURE_OPENAI_EMBED_DEPLOYMENT"]

def _azure_ready():
    return all(os.getenv(k) and os.getenv(k) not in ("dummy","unused") for k in REQUIRED)

def _embed(texts):
    ep = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
    dep = os.environ["AZURE_OPENAI_EMBED_DEPLOYMENT"]
    ver = os.environ["AZURE_OPENAI_API_VERSION"]
    key = os.environ["AZURE_OPENAI_API_KEY"]
    url = f"{ep}/openai/deployments/{dep}/embeddings?api-version={ver}"
    r = httpx.post(url, headers={"api-key": key, "Content-Type":"application/json"}, json={"input": texts}, timeout=60)
    r.raise_for_status()
    return [d["embedding"] for d in r.json()["data"]]

@pytest.mark.skipif(not _azure_ready(), reason="Azure env not set; skipping RAG smoke")
def test_rag_smoke_end2end():
    # 1) make a fresh collection with two snippets
    vecs = _embed(["foo bar quickstart", "service comes up with docker compose up"])
    dim = len(vecs[0])
    coll = "ci_docs"
    qc = QdrantClient(url=os.getenv("QDRANT_URL","http://qdrant:6333"))
    try:
        qc.create_collection(coll, vectors_config=VectorParams(size=dim, distance=Distance.COSINE))
    except Exception:
        pass
    pts = [
        PointStruct(id=uuid.uuid4().int % 10**12, vector=vecs[0], payload={"text":"foo bar quickstart", "source":"ci:1"}),
        PointStruct(id=uuid.uuid4().int % 10**12, vector=vecs[1], payload={"text":"service comes up with docker compose up", "source":"ci:2"}),
    ]
    qc.upsert(coll, points=pts)

    # 2) temporarily point the retriever at our test collection
    old = retr.COLLECTION
    retr.COLLECTION = coll
    try:
        client = TestClient(app)
        r = client.post("/explain", json={"question":"how do I use foo bar?"})
        assert r.status_code == 200
        j = r.json()
        text = " ".join(j.get("bullets", [])).lower()
        assert "foo bar" in text
        assert any(c.get("file","").startswith("ci:") for c in j.get("citations", []))
    finally:
        retr.COLLECTION = old
