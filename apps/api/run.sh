#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH=$(pwd)/src
uvicorn repoguide_api.main:app --reload --port ${API_PORT:-8000}
