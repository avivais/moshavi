#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Optional: source .env for Cloudflare credentials (local only; do not commit secrets)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DRY_RUN=false
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
  esac
done

echo "=== MoshAvi deploy ==="

# --- Preflight ---
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "Error: not on branch main. Switch to main and try again."
  exit 1
fi

if [ "$FORCE" != "true" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree has uncommitted changes. Commit (or use small logical commits) first, or use --force to skip this check."
  exit 1
fi

# Ensure latest is pushed (version bump will be pushed below; pre-push check is for prior commits)
if [ "$DRY_RUN" != "true" ]; then
  git push origin main 2>/dev/null || true
fi

# --- Version bump ---
CURRENT=$(node -p "require('./package.json').version")
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "Bumped version: $CURRENT -> $NEW_VERSION"

if [ "$DRY_RUN" = "true" ]; then
  echo "[dry-run] Would commit and push version bump, then run SSH deploy and Cloudflare purge."
  echo "New version would be: $NEW_VERSION"
  exit 0
fi

git add package.json package-lock.json
git commit -m "chore(release): $NEW_VERSION"
git push origin main

# --- Server deploy ---
SSH_KEY="${HOME}/.ssh/VaisenKey.pem"
SSH_HOST="ec2-98-84-90-118.compute-1.amazonaws.com"
SSH_USER="ubuntu"
APP_PATH="/var/www/moshavi"

echo "Deploying on server..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd $APP_PATH && git stash push -m 'pre-deploy' -- package.json package-lock.json 2>/dev/null; git pull && npm ci && npm run build && pm2 restart moshavi"

# --- Cloudflare purge (optional) ---
if [ -n "${CLOUDFLARE_ZONE_ID:-}" ] && [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Purging Cloudflare cache..."
  RESP=$(curl -sS -w "\n%{http_code}" -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')
  HTTP_CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"success":true'; then
    echo "Cloudflare cache purged."
  else
    echo "Warning: Cloudflare purge returned HTTP $HTTP_CODE or success=false. Check CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN."
  fi
else
  echo "Skipping Cloudflare purge (set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN in .env to enable)."
fi

# --- Verification ---
echo ""
echo "=== Deploy complete ==="
echo "Version: $NEW_VERSION"
echo "Verify: https://moshavi.com/api/version"
echo "Site:   https://moshavi.com"
