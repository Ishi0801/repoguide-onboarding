# src/repoguide_tools/preflight.py
from __future__ import annotations
import os, json, re
from pathlib import Path
from typing import List
import sys

try:
    import tomllib  # py311+
except ModuleNotFoundError:
    import tomli as tomllib  # fallback if running locally on older py

from repoguide_schemas.models import PreflightCheck, PreflightReport

def _read_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return None

def _read_toml(p: Path):
    try:
        return tomllib.loads(p.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return None

def _find_requires_python(toml: dict) -> str | None:
    # PEP 621
    rp = (toml.get("project") or {}).get("requires-python")
    if isinstance(rp, str):
        return rp
    # Poetry style
    py = ((toml.get("tool") or {}).get("poetry") or {}).get("dependencies") or {}
    v = py.get("python")
    return v if isinstance(v, str) else None

def run_preflight(path: str) -> PreflightReport:
    root = Path(path)
    checks: List[PreflightCheck] = []
    if not root.exists():
        return PreflightReport(path=str(root), checks=[PreflightCheck(
            name="Path exists", status="error",
            found="missing", expected=str(root),
            fix="Double-check the path; mount or clone the repo."
        )], summary="Repo path missing")

    # README
    readme = next((p for p in [root/"README.md", root/"readme.md"] if p.exists()), None)
    if readme:
        checks.append(PreflightCheck(name="README", status="ok", found=str(readme)))
    else:
        checks.append(PreflightCheck(name="README", status="warn", expected="README.md",
                                     fix="Add a README with setup and run instructions."))

    # pyproject.toml / requires-python
    pyproj = root / "pyproject.toml"
    if pyproj.exists():
        toml = _read_toml(pyproj) or {}
        req = _find_requires_python(toml)
        status = "ok" if req else "warn"
        fix = None if req else "Add project.requires-python in pyproject.toml (e.g., '>=3.11')"
        checks.append(PreflightCheck(name="Python version (pyproject)", status=status,
                                     found=req or "unspecified", expected=">=3.11", fix=fix))
    else:
        checks.append(PreflightCheck(name="pyproject.toml", status="warn",
                                     expected="pyproject.toml", fix="Consider using pyproject.toml for Python deps and version."))

    # package.json / engines.node
    pkg = root / "package.json"
    if pkg.exists():
        j = _read_json(pkg) or {}
        eng = (j.get("engines") or {}).get("node")
        status = "ok" if eng else "warn"
        fix = None if eng else "Add engines.node to package.json (e.g., '>=20')"
        checks.append(PreflightCheck(name="Node version (package.json)", status=status,
                                     found=eng or "unspecified", expected=">=20", fix=fix))
    else:
        checks.append(PreflightCheck(name="package.json", status="warn",
                                     expected="package.json", fix="Add package.json if there is a frontend or scripts."))

    # docker-compose.yml
    dc = root / "docker-compose.yml"
    checks.append(
        PreflightCheck(
            name="Docker Compose",
            status="ok" if dc.exists() else "warn",
            found=str(dc) if dc.exists() else "missing",
            expected="docker-compose.yml",
            fix=None if dc.exists() else "Add docker-compose.yml for one-command dev."
        )
    )

    # .env.example
    envex = root / ".env.example"
    checks.append(
        PreflightCheck(
            name=".env.example",
            status="ok" if envex.exists() else "warn",
            found=str(envex) if envex.exists() else "missing",
            expected=".env.example",
            fix=None if envex.exists() else "Create .env.example listing required env vars (no secrets)."
        )
    )

    # Tests hint (README mentions pytest)
    readme_text = readme.read_text(encoding="utf-8", errors="ignore") if readme else ""
    if "pytest" in readme_text:
        checks.append(PreflightCheck(name="Tests instruction", status="ok", found="pytest mentioned"))
    else:
        checks.append(PreflightCheck(name="Tests instruction", status="warn",
                                     expected="README shows how to run tests",
                                     fix="Document how to run tests (e.g., `pytest -q`)."))

    # Summary
    errors = sum(1 for c in checks if c.status == "error")
    warns = sum(1 for c in checks if c.status == "warn")
    summary = f"{errors} error(s), {warns} warning(s)"

    return PreflightReport(path=str(root), checks=checks, summary=summary)
