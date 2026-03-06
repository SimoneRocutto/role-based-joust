#!/usr/bin/env bash
# Quick orientation for a fresh Claude instance (or human).
# Shows: branch, recent commits, uncommitted changes, top TODO items.
# Does NOT run tests — use ./scripts/verify.sh for that.
# Usage: ./scripts/status.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Branch ==="
git -C "$ROOT" branch --show-current

echo ""
echo "=== Recent commits ==="
git -C "$ROOT" log --oneline -6

echo ""
echo "=== Uncommitted changes ==="
CHANGES=$(git -C "$ROOT" status --short)
if [ -z "$CHANGES" ]; then
  echo "(clean)"
else
  echo "$CHANGES"
fi

echo ""
echo "=== Top TODO items ==="
grep -m 6 "^\s*-" "$ROOT/TODO.md" 2>/dev/null | head -6 || echo "(TODO.md not found)"

echo ""
echo "--- Shortcuts ---"
echo "  ./scripts/dev.sh      start server + client"
echo "  ./scripts/verify.sh   run all tests + TypeScript check"
echo "  cd client && npm run screenshot     capture UI screenshots (1 phone)"
echo "  cd client && npm run screenshot:2p  capture UI screenshots (2 phones, per-player state)"
