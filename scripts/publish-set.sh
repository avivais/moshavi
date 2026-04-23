#!/usr/bin/env bash
# Publish a new Sets entry: encode MP4 locally (still image + audio), copy to EC2,
# register via POST /api/admin.
#
# Prerequisites: ffmpeg, rsync, ssh, curl, python3 on PATH.
#
# Configuration (env or repo-root .env):
#   MOSHAVI_ADMIN_TOKEN   Same value as server ADMIN_PASSWORD (Bearer token). If unset, ADMIN_PASSWORD from .env is used.
#   MOSHAVI_BASE_URL      API origin, default https://moshavi.com
#   MOSHAVI_SSH_HOST      EC2 host (default matches scripts/deploy.sh)
#   MOSHAVI_SSH_KEY       Path to SSH private key (default ~/.ssh/VaisenKey.pem)
#   MOSHAVI_SSH_USER      default ubuntu
#   MOSHAVI_REMOTE_APP    App root on server, default /var/www/moshavi
#
# Usage:
#   ./scripts/publish-set.sh \
#     --audio ./recording.wav \
#     --poster ./invite.jpg \
#     --title "MoshAvi #005" \
#     --date "18.04.2026" \
#     --basename MoshAvi-005
#
# Flags:
#   --dry-run          Run ffmpeg locally, print rsync/curl; skip upload and DB.
#   --skip-db          Copy files only; do not POST /api/admin.
#   --skip-collision-check   Do not GET /api/admin before encoding.
#   --force-collision  Proceed even if src/poster URL already exists in DB.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

AUDIO=""
POSTER=""
TITLE=""
DATE=""
BASENAME=""
DRY_RUN=0
SKIP_DB=0
SKIP_COLLISION_CHECK=0
FORCE_COLLISION=0

usage() {
  sed -n '1,80p' "$0" | tail -n +2
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audio) AUDIO="${2:-}"; shift 2 ;;
    --poster) POSTER="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --date) DATE="${2:-}"; shift 2 ;;
    --basename) BASENAME="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-db) SKIP_DB=1; shift ;;
    --skip-collision-check) SKIP_COLLISION_CHECK=1; shift ;;
    --force-collision) FORCE_COLLISION=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

die() { echo "Error: $*" >&2; exit 1; }

# macOS: sips avoids ffmpeg image2 single-file warnings on PNG/JPEG/etc. Linux: ffmpeg, warnings suppressed.
normalize_poster_jpeg() {
  local src="$1" dst="$2"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v sips >/dev/null; then
    if sips -s format jpeg "$src" --out "$dst" >/dev/null 2>&1 && [[ -s "$dst" ]]; then
      return 0
    fi
  fi
  ffmpeg -hide_banner -loglevel error -y -i "$src" -frames:v 1 -update 1 -q:v 2 "$dst"
}

[[ -n "$AUDIO" ]] || die "--audio is required"
[[ -n "$POSTER" ]] || die "--poster is required"
[[ -n "$TITLE" ]] || die "--title is required"
[[ -n "$DATE" ]] || die "--date is required"
[[ -n "$BASENAME" ]] || die "--basename is required"

[[ -f "$AUDIO" ]] || die "audio file not found: $AUDIO"
[[ -f "$POSTER" ]] || die "poster file not found: $POSTER"

TOKEN="${MOSHAVI_ADMIN_TOKEN:-${ADMIN_PASSWORD:-}}"
BASE_URL="${MOSHAVI_BASE_URL:-https://moshavi.com}"
BASE_URL="${BASE_URL%/}"
# Defaults align with scripts/deploy.sh so local .env usually only needs ADMIN_PASSWORD.
SSH_HOST="${MOSHAVI_SSH_HOST:-ec2-98-84-90-118.compute-1.amazonaws.com}"
SSH_KEY="${MOSHAVI_SSH_KEY:-$HOME/.ssh/VaisenKey.pem}"
SSH_USER="${MOSHAVI_SSH_USER:-ubuntu}"
REMOTE_APP="${MOSHAVI_REMOTE_APP:-/var/www/moshavi}"
REMOTE_APP="${REMOTE_APP%/}"

SRC_PATH="/media/sets/${BASENAME}.mp4"
POSTER_PATH="/media/poster/${BASENAME}.jpg"

require_remote_config() {
  [[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY — set MOSHAVI_SSH_KEY or place your key at ~/.ssh/VaisenKey.pem"
}

require_token() {
  [[ -n "$TOKEN" ]] || die "Set ADMIN_PASSWORD or MOSHAVI_ADMIN_TOKEN in repo-root .env (same value as production ADMIN_PASSWORD)"
}

check_collision() {
  require_token
  local json st
  json="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/admin")" || die "GET /api/admin failed (check MOSHAVI_BASE_URL and token)"
  st=0
  PUBLISH_SET_COLLISION_JSON="$json" \
  COLL_SRC="$SRC_PATH" \
  COLL_POSTER="$POSTER_PATH" \
  python3 <<'PY' || st=$?
import json, os, sys
src = os.environ["COLL_SRC"]
poster = os.environ["COLL_POSTER"]
data = json.loads(os.environ["PUBLISH_SET_COLLISION_JSON"])
sets = data.get("videoSets") or []
for row in sets:
    if row.get("src") == src or row.get("poster") == poster:
        print(
            "Collision: existing id={} title={} src={}".format(
                row.get("id"),
                repr(row.get("title")),
                repr(row.get("src")),
            ),
            file=sys.stderr,
        )
        sys.exit(2)
sys.exit(0)
PY
  unset PUBLISH_SET_COLLISION_JSON COLL_SRC COLL_POSTER
  if [[ "$st" -eq 2 ]]; then
    echo "Warning: a video set already uses this src or poster URL." >&2
    [[ "$FORCE_COLLISION" -eq 1 ]] || die "Use --force-collision to register anyway, or remove the row in admin first."
  elif [[ "$st" -ne 0 ]]; then
    exit "$st"
  fi
}

if [[ "$SKIP_COLLISION_CHECK" -eq 0 && -n "$TOKEN" ]]; then
  check_collision
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/moshavi-publish-set.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

command -v ffmpeg >/dev/null || die "ffmpeg not found"
command -v python3 >/dev/null || die "python3 not found"
command -v rsync >/dev/null || die "rsync not found"
command -v ssh >/dev/null || die "ssh not found"
command -v curl >/dev/null || die "curl not found"

POSTER_JPG="${WORK}/poster.jpg"
AUDIO_MP3="${WORK}/audio.mp3"
OUT_MP4="${WORK}/${BASENAME}.mp4"

echo "Normalizing poster to JPEG..."
normalize_poster_jpeg "$POSTER" "$POSTER_JPG" || die "Failed to normalize poster to JPEG"

ext="${AUDIO##*.}"
lower="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
if [[ "$lower" == "wav" ]]; then
  echo "Transcoding WAV to MP3..."
  ffmpeg -hide_banner -loglevel error -y -i "$AUDIO" -codec:a libmp3lame -qscale:a 2 "$AUDIO_MP3"
elif [[ "$lower" == "mp3" ]]; then
  cp "$AUDIO" "$AUDIO_MP3"
else
  die "Unsupported audio extension: .$ext (use .wav or .mp3)"
fi

echo "Muxing still image + audio to MP4 (this may take a while)..."
ffmpeg -hide_banner -loglevel warning -stats -y \
  -loop 1 -i "$POSTER_JPG" -i "$AUDIO_MP3" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  -shortest \
  "$OUT_MP4"

FINAL_POSTER="${WORK}/${BASENAME}.jpg"
cp "$POSTER_JPG" "$FINAL_POSTER"

SSH_BASE=(ssh -i "$SSH_KEY" -o BatchMode=yes -o IdentitiesOnly=yes "${SSH_USER}@${SSH_HOST}")
RSYNC_E=(rsync -avz --progress -e "ssh -i ${SSH_KEY} -o BatchMode=yes -o IdentitiesOnly=yes")

remote_prepare() {
  "${SSH_BASE[@]}" "mkdir -p '${REMOTE_APP}/public/media/sets' '${REMOTE_APP}/public/media/poster'"
}

remote_upload() {
  "${RSYNC_E[@]}" "$OUT_MP4" "${SSH_USER}@${SSH_HOST}:${REMOTE_APP}/public/media/sets/${BASENAME}.mp4"
  "${RSYNC_E[@]}" "$FINAL_POSTER" "${SSH_USER}@${SSH_HOST}:${REMOTE_APP}/public/media/poster/${BASENAME}.jpg"
}

post_admin() {
  require_token
  local payload
  payload="$(python3 -c "
import json, sys
title, date, src, poster = sys.argv[1:5]
print(json.dumps({'type': 'videoSet', 'data': {'title': title, 'date': date, 'src': src, 'poster': poster}}))
" "$TITLE" "$DATE" "$SRC_PATH" "$POSTER_PATH")"
  curl -fsS -X POST "${BASE_URL}/api/admin" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary "$payload"
  echo ""
  echo "Registered video set in database."
}

if [[ "$DRY_RUN" -eq 1 ]]; then
  trap - EXIT
  echo ""
  echo "=== Dry run: would run ==="
  echo "${SSH_BASE[*]} \"mkdir -p '${REMOTE_APP}/public/media/sets' '${REMOTE_APP}/public/media/poster'\""
  echo "${RSYNC_E[*]} \"$OUT_MP4\" \"${SSH_USER}@${SSH_HOST}:${REMOTE_APP}/public/media/sets/${BASENAME}.mp4\""
  echo "${RSYNC_E[*]} \"$FINAL_POSTER\" \"${SSH_USER}@${SSH_HOST}:${REMOTE_APP}/public/media/poster/${BASENAME}.jpg\""
  if [[ "$SKIP_DB" -eq 0 ]]; then
    echo "curl -X POST ${BASE_URL}/api/admin -H 'Authorization: Bearer …' -d '{...}'"
  fi
  echo "Local build output (not removed): $WORK"
  echo "=== End dry run ==="
  exit 0
fi

require_remote_config

echo "Uploading to ${SSH_USER}@${SSH_HOST}..."
remote_prepare
remote_upload

if [[ "$SKIP_DB" -eq 1 ]]; then
  echo "Uploaded MP4 and poster; skipped DB registration (--skip-db)."
  echo "MP4 on server: ${REMOTE_APP}/public/media/sets/${BASENAME}.mp4"
  echo "Poster on server: ${REMOTE_APP}/public/media/poster/${BASENAME}.jpg"
  echo "To register later: admin UI or re-run with same paths and without --skip-db."
  exit 0
fi

require_token
echo "Registering set via API..."
post_admin

echo "Done. src=${SRC_PATH} poster=${POSTER_PATH}"
echo "If the site does not show new media immediately, purge Cloudflare cache (see DEPLOYMENT.md)."
