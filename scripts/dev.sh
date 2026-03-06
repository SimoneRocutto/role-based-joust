#!/usr/bin/env bash
# Start both the server and client dev servers with correct environment variables.
# Reads per-worktree port overrides from .env.local files (gitignored).
# Usage: ./scripts/dev.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_PORT=$(grep "^PORT=" "$ROOT/server/.env.local" 2>/dev/null | cut -d= -f2 || echo "4000")
CLIENT_PORT=$(grep "^VITE_PORT=" "$ROOT/client/.env.local" 2>/dev/null | cut -d= -f2 || echo "5173")
VITE_BACKEND_PORT=$(grep "^VITE_BACKEND_PORT=" "$ROOT/client/.env.local" 2>/dev/null | cut -d= -f2 || echo "$BACKEND_PORT")

echo "Server  → http://localhost:$BACKEND_PORT  (NODE_ENV=development)"
echo "Client  → http://localhost:$CLIENT_PORT   (backend: $VITE_BACKEND_PORT)"
echo "Press Ctrl+C to stop both."
echo ""

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

(cd "$ROOT/server" && NODE_ENV=development PORT="$BACKEND_PORT" npm run dev) &
SERVER_PID=$!

(cd "$ROOT/client" && VITE_BACKEND_PORT="$VITE_BACKEND_PORT" VITE_PORT="$CLIENT_PORT" npm run dev) &
CLIENT_PID=$!

wait
