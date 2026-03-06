#!/usr/bin/env bash
# Run all checks: server tests, client unit tests, TypeScript type check.
# Usage: ./scripts/verify.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Server tests ==="
(cd "$ROOT/server" && npm test)

echo ""
echo "=== Client unit tests ==="
(cd "$ROOT/client" && npm run test:run)

echo ""
echo "=== TypeScript check ==="
(cd "$ROOT/client" && npx tsc --noEmit)

echo ""
echo "All checks passed."
