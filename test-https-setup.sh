#!/bin/bash

# Test script for HTTPS setup validation
# Run from the project root directory

set -e

echo "=== HTTPS Setup Test ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS:${NC} $1"; }
fail() { echo -e "${RED}✗ FAIL:${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

# Check certificates exist
echo "1. Checking certificates..."
if [ -f "certs/server.crt" ] && [ -f "certs/server.key" ]; then
    pass "Certificates exist in certs/"
else
    fail "Certificates not found in certs/"
fi

# Check server .env
echo ""
echo "2. Checking server configuration..."
if grep -q "PORT=4000" server/.env 2>/dev/null; then
    pass "Server configured for port 4000"
else
    fail "Server PORT not set to 4000 in server/.env"
fi

# Check client .env doesn't bypass proxy
echo ""
echo "3. Checking client configuration..."
if grep -q "^VITE_API_BASE_URL=" client/.env 2>/dev/null; then
    fail "VITE_API_BASE_URL is set - this bypasses the proxy! Comment it out."
else
    pass "VITE_API_BASE_URL not set (will use proxy)"
fi

# Check Vite config has correct backend port
echo ""
echo "4. Checking Vite proxy configuration..."
if grep -q "localhost:4000" client/vite.config.js 2>/dev/null; then
    pass "Vite proxy targets port 4000"
else
    fail "Vite proxy not targeting port 4000"
fi

# Check CORS includes HTTPS
echo ""
echo "5. Checking CORS configuration..."
if grep -q "https://localhost:5173" server/.env 2>/dev/null; then
    pass "CORS includes HTTPS origins"
else
    fail "CORS missing HTTPS origins in server/.env"
fi

echo ""
echo "=== All checks passed! ==="
echo ""
echo "To run with HTTPS:"
echo "  Terminal 1: cd server && npm run dev"
echo "  Terminal 2: cd client && npm run dev:https"
echo ""
echo "Then access: https://localhost:5173 or https://192.168.1.101:5173"
echo "(Accept the self-signed certificate warning in your browser)"
