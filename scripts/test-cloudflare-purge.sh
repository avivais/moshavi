#!/usr/bin/env bash
# Test Cloudflare cache purge for moshavi.com. Requires .env with CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -z "${CLOUDFLARE_ZONE_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Missing Cloudflare credentials. Add to .env (copy from .env.example):"
  echo "  CLOUDFLARE_ZONE_ID=your-zone-id"
  echo "  CLOUDFLARE_API_TOKEN=your-api-token"
  echo "Zone ID: Cloudflare dashboard → moshavi.com → Overview (URL or API section)."
  echo "Token: https://dash.cloudflare.com/profile/api-tokens (Zone → Cache Purge → Purge)."
  exit 1
fi

echo "Purging Cloudflare cache for zone $CLOUDFLARE_ZONE_ID..."
RESP=$(curl -sS -w "\n%{http_code}" -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"success":true'; then
  echo "Cloudflare cache purge succeeded."
  echo "$BODY" | head -c 200
  echo ""
else
  echo "Cloudflare purge failed (HTTP $HTTP_CODE)."
  echo "$BODY"
  exit 1
fi
