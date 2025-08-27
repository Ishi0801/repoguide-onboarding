# src/repoguide_indexer/index_repo.py
from __future__ import annotations
import os, uuid
from pathlib import Path
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

COLLECTION = "repoguide_docs"  # reuse the same collection we seeded

def _embed(texts: list[str]) -> list[list[float]]:
    endpoint = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
    dep = os.environ["AZURE_OPENAI_EMBED_DEPLOYMENT"]
    ver = os.environ["AZURE_OPENAI_API_VERSION"]
    key = os.environ["AZURE_OPENAI_API_KEY"]
    url = f"{endpoint}/openai/deployments/{dep}/embeddings?api-version={ver}"
    r = httpx.post(
        url,
        headers={"api-key": key, "Content-Type": "application/json"},
        json={"input": texts},
        timeout=60.0,
    )
    r.raise_for_status()
    return [d["embedding"] for d in r.json()["data"]]

def _chunks(text: str, size: int = 800, overlap: int = 100):
    i, n = 0, len(text)
    while i < n:
        chunk = text[i : i + size]
        if chunk.strip():
            yield chunk
        i += max(1, size - overlap)

def _iter_files(root: Path):
    exts = {".md", ".py", ".txt"}
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p

def index_local_repo(path: str) -> int:
    root = Path(path)
    if not root.exists():
        return 0

    # collect chunks
    payloads, texts = [], []
    for f in _iter_files(root):
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        rel = str(f.relative_to(root))
        for idx, ch in enumerate(_chunks(content)):
            texts.append(ch)
            payloads.append({"source": f"{rel}:{idx}", "text": ch})

    if not texts:
        return 0

    # embed in small batches
    vectors, B = [], 16
    for i in range(0, len(texts), B):
        vectors.extend(_embed(texts[i : i + B]))

    dim = len(vectors[0])
    client = QdrantClient(url=os.getenv("QDRANT_URL", "http://qdrant:6333"))

    # create collection if needed (idempotent)
    try:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
    except Exception:
        pass

    points = [
        PointStruct(id=uuid.uuid4().int % 10**12, vector=v, payload=pl)
        for v, pl in zip(vectors, payloads)
    ]
    client.upsert(collection_name=COLLECTION, points=points)
    return len(points)
