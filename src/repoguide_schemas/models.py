from pydantic import BaseModel
from typing import Optional, List, Literal

class PreflightCheck(BaseModel):
    name: str
    status: Literal["ok", "warn", "error"]
    found: Optional[str] = None
    expected: Optional[str] = None
    fix: Optional[str] = None

class PreflightReport(BaseModel):
    path: str
    checks: List[PreflightCheck]
    summary: str


class Citation(BaseModel):
    source: str
    file: str
    start_line: int
    end_line: int
    url: Optional[str] = None

class Answer(BaseModel):
    summary: str
    bullets: List[str]
    citations: List[Citation]

class APIInfo(BaseModel):
    route: str
    method: str
    example_curl: str
    code_paths: List[Citation]
    tests: List[Citation]

class FileChange(BaseModel):
    file: str
    count: Optional[int] = None         # number of commits touching the file (git-mode)
    modified_at: Optional[str] = None   # ISO timestamp (mtime fallback)

class CommitSummary(BaseModel):
    hash: str
    date: str
    subject: str
    files: list[str]

class ChangeDigestReport(BaseModel):
    path: str
    since: str
    commit_count: int
    top_files: list[FileChange]
    commits: list[CommitSummary]
    note: Optional[str] = None 

class OnboardAction(BaseModel):
    name: str
    status: Literal["todo", "done"]
    detail: str | None = None

class OnboardReport(BaseModel):
    path: str
    chunks_indexed: int
    preflight: PreflightReport
    links: dict
    next_steps: list[OnboardAction]