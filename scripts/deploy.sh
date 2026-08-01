#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DRY_RUN=false
FORCE=false
SKIP_VERSION_BUMP=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --skip-version-bump) SKIP_VERSION_BUMP=true ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./scripts/deploy.sh [--dry-run] [--force] [--skip-version-bump]" >&2
      exit 2
      ;;
  esac
done

SSH_KEY="${MOSHAVI_SSH_KEY:-${HOME}/.ssh/VaisenKey.pem}"
SSH_HOST="${MOSHAVI_SSH_HOST:-ec2-98-84-90-118.compute-1.amazonaws.com}"
SSH_USER="${MOSHAVI_SSH_USER:-ubuntu}"
APP_PATH="${MOSHAVI_REMOTE_APP:-/var/www/moshavi}"
BACKUP_ROOT="${MOSHAVI_BACKUP_ROOT:-/var/backups/moshavi}"
BASE_URL="${MOSHAVI_BASE_URL:-https://moshavi.com}"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SSH_OPTIONS=(-o BatchMode=yes -o ConnectTimeout=15 -i "$SSH_KEY")

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command is missing: $1" >&2
    exit 1
  fi
}

json_field() {
  node -e 'const chunks=[]; process.stdin.on("data", c => chunks.push(c)); process.stdin.on("end", () => { const value=JSON.parse(Buffer.concat(chunks)); const result=value[process.argv[1]]; if (result == null) process.exit(1); process.stdout.write(String(result)); });' "$1"
}

next_patch_version() {
  node -e 'const [major,minor,patch]=require("./package.json").version.split(".").map(Number); if (![major,minor,patch].every(Number.isInteger)) process.exit(1); process.stdout.write(`${major}.${minor}.${patch + 1}`);'
}

remote_backup() {
  ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" \
    "sudo bash -s -- '$APP_PATH' '$BACKUP_ROOT'" < "$SCRIPT_DIR/backup-production.sh"
}

rollback_remote() {
  local previous_sha="$1"
  local backup_dir="$2"
  echo "Deployment failed; rolling production back to $previous_sha..." >&2
  ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" bash -s -- "$APP_PATH" "$previous_sha" "$backup_dir" <<'REMOTE_ROLLBACK'
set -Eeuo pipefail
APP_PATH="$1"
PREVIOUS_SHA="$2"
BACKUP_DIR="$3"
cd "$APP_PATH"
pm2 stop moshavi >/dev/null 2>&1 || true
if [[ -f "$BACKUP_DIR/moshavi.db" ]]; then
  sudo cp "$BACKUP_DIR/moshavi.db" "$APP_PATH/moshavi.db"
  sudo chown "$(id -u):$(id -g)" "$APP_PATH/moshavi.db"
fi
git reset --hard "$PREVIOUS_SHA"
npm ci
npm run build
pm2 restart moshavi --update-env
REMOTE_ROLLBACK
}

echo "=== MoshAvi safe deploy ==="

for command_name in git node npm ssh curl; do
  require_command "$command_name"
done

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Error: SSH key does not exist: $SSH_KEY" >&2
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "Error: deploys must run from branch main." >&2
  exit 1
fi

if [[ "$FORCE" != true && -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree has uncommitted changes." >&2
  exit 1
fi

git fetch --quiet origin main
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
BEHIND_COUNT="$(git rev-list --count HEAD..origin/main)"
AHEAD_COUNT="$(git rev-list --count origin/main..HEAD)"

if [[ "$BEHIND_COUNT" != "0" ]]; then
  echo "Error: local main is behind origin/main by $BEHIND_COUNT commit(s). Fast-forward first." >&2
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./package.json').version")"
if [[ "$SKIP_VERSION_BUMP" == true ]]; then
  NEW_VERSION="$CURRENT_VERSION"
else
  NEW_VERSION="$(next_patch_version)"
fi

printf 'Current version: %s\n' "$CURRENT_VERSION"
printf 'Planned version: %s\n' "$NEW_VERSION"
printf 'Local commits not yet pushed: %s\n' "$AHEAD_COUNT"
printf 'Target: %s:%s\n' "$SSH_TARGET" "$APP_PATH"

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete: no files, commits, remote state, cache, or processes were changed."
  exit 0
fi

echo "Running clean local production build..."
npm ci
npm run build

if [[ "$SKIP_VERSION_BUMP" != true ]]; then
  npm version patch --no-git-tag-version
  git add package.json package-lock.json
  git commit -m "chore(release): $NEW_VERSION"
fi

git push origin main
EXPECTED_SHA="$(git rev-parse HEAD)"

echo "Creating verified production backup..."
BACKUP_JSON="$(remote_backup)"
printf '%s\n' "$BACKUP_JSON"
BACKUP_DIR="$(printf '%s' "$BACKUP_JSON" | json_field backup)"
if [[ -z "$BACKUP_DIR" ]]; then
  echo "Error: production backup directory could not be resolved." >&2
  exit 1
fi

PREVIOUS_SHA="$(ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" "cd '$APP_PATH' && git rev-parse HEAD")"
echo "Deploying $EXPECTED_SHA over $PREVIOUS_SHA..."

if ! ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" bash -s -- "$APP_PATH" "$EXPECTED_SHA" <<'REMOTE_DEPLOY'
set -Eeuo pipefail
APP_PATH="$1"
EXPECTED_SHA="$2"
cd "$APP_PATH"

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  echo "Error: production checkout is not on main." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Error: production has tracked local changes; refusing to overwrite them." >&2
  git status --short --untracked-files=no >&2
  exit 1
fi

git fetch origin main
if [[ "$(git rev-parse origin/main)" != "$EXPECTED_SHA" ]]; then
  echo "Error: origin/main does not match the expected release commit." >&2
  exit 1
fi

git merge --ff-only origin/main
npm ci
npm run build
mkdir -p public/media/gallery public/media/gallery/thumbs
npm run db:setup
pm2 restart moshavi --update-env

for attempt in {1..20}; do
  BODY="$(curl -fsS --max-time 5 http://127.0.0.1:3000/api/version || true)"
  if [[ -n "$BODY" ]]; then
    LIVE_SHA="$(printf '%s' "$BODY" | node -e 'const chunks=[]; process.stdin.on("data", c => chunks.push(c)); process.stdin.on("end", () => { const value=JSON.parse(Buffer.concat(chunks)); process.stdout.write(value.gitSha || ""); });' 2>/dev/null || true)"
    if [[ "$EXPECTED_SHA" == "$LIVE_SHA"* ]]; then
      pm2 save >/dev/null
      exit 0
    fi
  fi
  sleep 1
done

echo "Error: local production health check did not report the expected git SHA." >&2
exit 1
REMOTE_DEPLOY
then
  rollback_remote "$PREVIOUS_SHA" "$BACKUP_DIR"
  exit 1
fi

if [[ -n "${CLOUDFLARE_ZONE_ID:-}" && -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Purging Cloudflare cache..."
  CLOUDFLARE_RESPONSE="$(curl -sS -w '\n%{http_code}' -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')"
  CLOUDFLARE_HTTP_CODE="$(printf '%s\n' "$CLOUDFLARE_RESPONSE" | tail -n 1)"
  CLOUDFLARE_BODY="$(printf '%s\n' "$CLOUDFLARE_RESPONSE" | sed '$d')"
  if [[ "$CLOUDFLARE_HTTP_CODE" != "200" ]] || ! printf '%s' "$CLOUDFLARE_BODY" | grep -qE '"success"\s*:\s*true'; then
    echo "Warning: Cloudflare purge failed; production itself remains healthy." >&2
  fi
else
  echo "Skipping Cloudflare purge: credentials are not configured locally."
fi

PUBLIC_VERSION="$(curl -fsS --retry 5 --retry-delay 2 --max-time 15 "$BASE_URL/api/version")"
PUBLIC_SHA="$(printf '%s' "$PUBLIC_VERSION" | json_field gitSha)"
PUBLIC_VERSION_NUMBER="$(printf '%s' "$PUBLIC_VERSION" | json_field version)"
if [[ "$EXPECTED_SHA" != "$PUBLIC_SHA"* ]]; then
  echo "Error: public version endpoint reports $PUBLIC_SHA, expected $EXPECTED_SHA." >&2
  exit 1
fi

printf '\n=== Deploy verified ===\n'
printf 'Version: %s\n' "$PUBLIC_VERSION_NUMBER"
printf 'Git SHA: %s\n' "$PUBLIC_SHA"
printf 'Backup:  %s\n' "$BACKUP_DIR"
printf 'Site:    %s\n' "$BASE_URL"
