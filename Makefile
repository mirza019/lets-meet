.PHONY: install backend frontend dev test lint format migrate
install:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt
	cd frontend && npm install
backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload
frontend:
	cd frontend && npm run dev
dev:
	./scripts/dev.sh
test:
	cd backend && .venv/bin/pytest
	cd frontend && npm test
lint:
	cd backend && .venv/bin/ruff check app tests
	cd frontend && npm run lint
format:
	cd backend && .venv/bin/ruff format app tests
	cd frontend && npm run format
migrate:
	cd backend && .venv/bin/alembic upgrade head
