# src/repoguide_retriever/hybrid.py
import os, httpx
from qdrant_client import QdrantClient
from repoguide_schemas.models import Answer, Citation

COLLECTION = "repoguide_docs"

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

def explain_from_qdrant(question: str, scope: str | None = None) -> Answer | None:
    # Embed the question
    qvec = _embed([question])[0]

    # Search Qdrant
    client = QdrantClient(url=os.getenv("QDRANT_URL", "http://qdrant:6333"))
    hits = client.search(
        collection_name=COLLECTION,
        query_vector=qvec,
        limit=3,
    )
    if not hits:
        return None

    # Build a grounded answer with simple bullets + citations
    bullets, citations = [], []
    for h in hits:
        text = h.payload.get("text", "")
        source = h.payload.get("source", "unknown")
        bullets.append(text)
        citations.append(
            Citation(source="qdrant", file=source, start_line=1, end_line=1, url="")
        )

    summary = f"Grounded explanation based on {len(hits)} snippet(s)."
    return Answer(summary=summary, bullets=bullets, citations=citations)
