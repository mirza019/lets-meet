#!/usr/bin/env bash
set -euo pipefail

mkdir -p /home/data
alembic upgrade head
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
