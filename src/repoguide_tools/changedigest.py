# src/repoguide_tools/changedigest.py
from __future__ import annotations
import os, subprocess, time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from collections import Counter, defaultdict

from repoguide_schemas.models import ChangeDigestReport, CommitSummary, FileChange

def _since_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()

def _run_git(path: Path, args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(path), *args],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )

def change_digest(path: str, days: int = 30, commit_limit: int = 20) -> ChangeDigestReport:
    p = Path(path)
    since = _since_iso(days)
    if not p.exists():
        return ChangeDigestReport(
            path=str(p), since=since, commit_count=0, top_files=[], commits=[],
            note="Path missing"
        )

    # --- Try git mode ---
    if (p / ".git").exists():
        log_args = [
            "log", f"--since={since}",
            "--date=short", "--pretty=format:%h\t%ad\t%s", "--name-only"
        ]
        proc = _run_git(p, log_args)
        if proc.returncode == 0:
            lines = proc.stdout.splitlines()
            commits: list[CommitSummary] = []
            files_counter: Counter[str] = Counter()

            cur = None
            for ln in lines:
                if not ln.strip():
                    continue
                if "\t" in ln and len(ln.split("\t", 2)) == 3:
                    # commit header
                    h, d, s = ln.split("\t", 2)
                    if cur:
                        commits.append(cur)
                    cur = CommitSummary(hash=h, date=d, subject=s, files=[])
                else:
                    # file line
                    if cur:
                        cur.files.append(ln.strip())
                        files_counter[ln.strip()] += 1
            if cur:
                commits.append(cur)

            # Limit commit list
            commits = commits[:commit_limit]
            top_files = [
                FileChange(file=f, count=c) for f, c in files_counter.most_common(10)
            ]
            return ChangeDigestReport(
                path=str(p), since=since, commit_count=len(lines) > 0 and len(commits) or 0,
                top_files=top_files, commits=commits, note=None
            )
        # if git fails unexpectedly, we fall through to mtime mode

    # --- Fallback: mtime mode (works for non-git folders) ---
    cutoff = datetime.fromisoformat(since)
    changed: list[FileChange] = []
    for fp in p.rglob("*"):
        if not fp.is_file():
            continue
        try:
            ts = fp.stat().st_mtime
        except Exception:
            continue
        dt = datetime.fromtimestamp(ts)
        if dt.date() >= cutoff.date():
            changed.append(FileChange(file=str(fp.relative_to(p)), modified_at=dt.isoformat()))

    # pick 10 most recently modified
    changed.sort(key=lambda x: x.modified_at or "", reverse=True)
    top_files = changed[:10]
    return ChangeDigestReport(
        path=str(p), since=since, commit_count=0, top_files=top_files, commits=[],
        note="Not a git repo, using file modification time fallback"
    )
