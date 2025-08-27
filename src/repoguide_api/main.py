from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from repoguide_indexer.index_repo import index_local_repo
import os

from repoguide_schemas.models import Answer, APIInfo, Citation, PreflightReport, ChangeDigestReport, OnboardReport
from repoguide_tools.onboard import run_onboard
from repoguide_tools.changedigest import change_digest
from repoguide_retriever.hybrid import explain_from_qdrant
from repoguide_tools.preflight import run_preflight

app = FastAPI(title="RepoGuide API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExplainRequest(BaseModel):
    question: str
    scope: str | None = None

class PreflightRequest(BaseModel):
    path: str = "/app/src/demo_repo"

class IndexRequest(BaseModel):
    path: str

class IndexResponse(BaseModel):
    path: str
    chunks_indexed: int

class ChangeDigestRequest(BaseModel):
    path: str = "/app/src/demo_repo"
    days: int = 30

class OnboardRequest(BaseModel):
    path: str = "/app/src/demo_repo"
    index: bool = False

@app.post("/onboard", response_model=OnboardReport)
def onboard(req: OnboardRequest):
    return run_onboard(req.path, do_index=req.index)

@app.post("/change-digest", response_model=ChangeDigestReport)
def change_digest_route(req: ChangeDigestRequest):
    return change_digest(req.path, days=req.days)


@app.get("/health")
def health():
    return {"status": "ok", "qdrant_url": os.getenv("QDRANT_URL")}

@app.post("/explain", response_model=Answer)
def explain(req: ExplainRequest):
    ans = explain_from_qdrant(req.question, req.scope)
    if not ans:
        raise HTTPException(status_code=404, detail="NEEDS_MORE_CONTEXT")
    return ans

@app.post("/preflight", response_model=PreflightReport)
def preflight(req: PreflightRequest):
    return run_preflight(req.path)

@app.post("/index", response_model=IndexResponse)
def index_repo(req: IndexRequest):
    n = index_local_repo(req.path)
    return IndexResponse(path=req.path, chunks_indexed=n)

@app.get("/api-info", response_model=APIInfo)
def api_info(route: str = "/", method: str = "GET"):
    example = f"curl -X {method} http://localhost:8000{route} -H 'Authorization: Bearer <token>'"
    return APIInfo(
        route=route, method=method, example_curl=example,
        code_paths=[Citation(source="repo", file="app/routes.py", start_line=10, end_line=40, url="")],
        tests=[Citation(source="repo", file="tests/test_routes.py", start_line=1, end_line=30, url="")]
    )
