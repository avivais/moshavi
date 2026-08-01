#!/usr/bin/env bash
set -Eeuo pipefail

APP_PATH="${1:-${MOSHAVI_REMOTE_APP:-/var/www/moshavi}}"
BACKUP_ROOT="${2:-${MOSHAVI_BACKUP_ROOT:-/var/backups/moshavi}}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DESTINATION="${BACKUP_ROOT}/${TIMESTAMP}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Error: app path does not exist: $APP_PATH" >&2
  exit 1
fi

if [[ ! -f "$APP_PATH/moshavi.db" ]]; then
  echo "Error: database does not exist: $APP_PATH/moshavi.db" >&2
  exit 1
fi

umask 077
mkdir -p "$DESTINATION"

python3 - "$APP_PATH" "$DESTINATION" <<'PY'
import json
import pathlib
import shutil
import sqlite3
import subprocess
import sys

app = pathlib.Path(sys.argv[1]).resolve()
destination = pathlib.Path(sys.argv[2]).resolve()
destination.mkdir(parents=True, exist_ok=True)

source_db = app / "moshavi.db"
backup_db = destination / "moshavi.db"
source = sqlite3.connect(f"file:{source_db}?mode=ro", uri=True)
target = sqlite3.connect(backup_db)
source.backup(target)
target.close()
source.close()

for name in (".env", "ecosystem.config.js", "package.json", "package-lock.json", ".build-info.json"):
    source_file = app / name
    if source_file.exists():
        shutil.copy2(source_file, destination / name)

with (destination / "git-status.txt").open("w") as output:
    subprocess.run(
        ["git", "status", "--short", "--branch"],
        cwd=app,
        check=True,
        text=True,
        stdout=output,
    )

with (destination / "git-head.txt").open("w") as output:
    subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=app,
        check=True,
        text=True,
        stdout=output,
    )

media_manifest = []
for relative_directory in ("public/media/gallery", "public/media/sets", "public/media/poster"):
    directory = app / relative_directory
    if not directory.exists():
        continue
    for media_file in sorted(path for path in directory.rglob("*") if path.is_file()):
        file_stat = media_file.stat()
        media_manifest.append(
            {
                "path": str(media_file.relative_to(app)),
                "size": file_stat.st_size,
                "mtime": round(file_stat.st_mtime),
            }
        )

(destination / "media-manifest.json").write_text(
    json.dumps(media_manifest, indent=2) + "\n",
    encoding="utf-8",
)

for backup_file in destination.rglob("*"):
    if backup_file.is_file():
        backup_file.chmod(0o600)
destination.chmod(0o700)

verification = sqlite3.connect(f"file:{backup_db}?mode=ro", uri=True)
integrity = verification.execute("PRAGMA integrity_check").fetchone()[0]
counts = {
    table: verification.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    for table in ("gallery_media", "video_sets", "playlists", "carousel_images")
}
verification.close()

if integrity != "ok":
    raise RuntimeError(f"SQLite backup integrity check failed: {integrity}")

result = {
    "backup": str(destination),
    "integrity": integrity,
    "counts": counts,
    "mediaManifestEntries": len(media_manifest),
}
print(json.dumps(result, separators=(",", ":")))
PY

if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
  chown -R "$SUDO_USER:$SUDO_USER" "$DESTINATION"
fi
