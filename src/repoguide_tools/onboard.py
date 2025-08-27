# src/repoguide_tools/onboard.py
from __future__ import annotations
import os

from repoguide_schemas.models import OnboardReport, OnboardAction, PreflightReport
from repoguide_tools.preflight import run_preflight
from repoguide_indexer.index_repo import index_local_repo

def _next_steps_from_preflight(pf: PreflightReport) -> list[OnboardAction]:
    steps: list[OnboardAction] = []
    for c in pf.checks:
        if c.status == "warn":
            msg = c.fix or f"Review: {c.name}"
            steps.append(OnboardAction(name=c.name, status="todo", detail=msg))
    if not steps:
        steps.append(OnboardAction(name="Everything looks good", status="done"))
    return steps

def run_onboard(path: str, do_index: bool = False) -> OnboardReport:
    pf = run_preflight(path)
    chunks = index_local_repo(path) if do_index else 0

    api_port = os.getenv("API_PORT", "8000")
    links = {
        "api_health": f"http://localhost:{api_port}/health",
        "api_docs": f"http://localhost:{api_port}/docs",
        "qdrant_dashboard": "http://localhost:6333/dashboard",
        "web_app": "http://localhost:3000",
    }

    return OnboardReport(
        path=path,
        chunks_indexed=chunks,
        preflight=pf,
        links=links,
        next_steps=_next_steps_from_preflight(pf),
    )
