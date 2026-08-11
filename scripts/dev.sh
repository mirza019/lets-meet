#!/usr/bin/env sh
set -eu
trap 'kill 0' INT TERM EXIT
(cd backend && .venv/bin/uvicorn app.main:app --reload) &
(cd frontend && npm run dev) &
wait
