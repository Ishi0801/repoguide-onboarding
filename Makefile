.PHONY: setup dev lint test fmt type check up down

setup:
	python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt

dev:
	uvicorn repoguide_api.main:app --reload --port 8000

lint:
	ruff check src

fmt:
	black src

type:
	mypy src

test:
	pytest -q

up:
	docker compose up --build

down:
	docker compose down -v
