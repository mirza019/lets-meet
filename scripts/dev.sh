#!/usr/bin/env sh
set -eu

backend_pid=""
frontend_pid=""

cleanup() {
  [ -z "$frontend_pid" ] || kill "$frontend_pid" 2>/dev/null || true
  [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

if curl -fsS --max-time 2 http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo "Backend is already healthy on port 8000; reusing it."
else
  (cd backend && exec .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
  backend_pid=$!
  attempts=0
  until curl -fsS --max-time 2 http://127.0.0.1:8000/health >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 20 ] || ! kill -0 "$backend_pid" 2>/dev/null; then
      echo "Backend could not start. Check backend/.env and whether port 8000 is occupied." >&2
      exit 1
    fi
    sleep 0.5
  done
fi

# Vite can otherwise coexist on IPv4 and IPv6 under the same port, causing
# localhost to randomly reach an older process. Stop only Vite instances that
# were launched from this project's frontend directory.
project_frontend=$(cd frontend && pwd)
for vite_pid in $(lsof -nP -iTCP:5173 -sTCP:LISTEN -t 2>/dev/null || true); do
  vite_command=$(ps -p "$vite_pid" -o command= 2>/dev/null || true)
  case "$vite_command" in
    *"$project_frontend/node_modules/.bin/vite"*)
      echo "Stopping stale project frontend process $vite_pid."
      kill "$vite_pid" 2>/dev/null || true
      ;;
  esac
done

(cd frontend && exec npm run dev) &
frontend_pid=$!
wait "$frontend_pid"
