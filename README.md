# RepoGuide – Onboarding Essentials

An agentic onboarding assistant that:
- Checks & fixes local dev setup issues (self-healing preflight)
- Explains architecture with citations
- Maps API routes to source + tests
- Summarizes recent changes
- Surfaces common pitfalls

## Quick start (with Docker Compose)
```bash
cp .env.example .env
docker compose up --build
```
- API: http://localhost:8000/docs
- Web: http://localhost:3000
- Qdrant (vector DB): http://localhost:6333 (UI at /dashboard)

## Local dev (Python only)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn repoguide_api.main:app --reload --port 8000
```

## Structure
```
src/
  repoguide_api/         # FastAPI app + agents
  repoguide_retriever/   # hybrid retrieval (BM25 + dense) + reranker hooks
  repoguide_schemas/     # Pydantic models
  repoguide_indexer/     # repo indexer and sync jobs
apps/
  api/                   # uvicorn launch script (optional)
  web/                   # Next.js frontend
infra/docker/            # Dockerfiles and compose
.github/workflows/       # CI/CD workflows
```
