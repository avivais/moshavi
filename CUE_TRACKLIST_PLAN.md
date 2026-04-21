# Add Cue-Based Set Tracklists

## Goal
Enable each set in `/sets` to show a polished tracklist where tapping/clicking a track seeks playback to that timestamp, with first-class support on mobile and desktop.

## Current State (validated)
- Sets UI already supports precise seeking via `seekTo()` in [`app/sets/SetsClient.tsx`](app/sets/SetsClient.tsx).
- Set metadata API currently returns only `id/title/date/src/poster` from [`app/api/videoSets/route.ts`](app/api/videoSets/route.ts).
- Publish pipeline already has a single entry point in [`scripts/publish-set.sh`](scripts/publish-set.sh), which is the right place to ingest `.cue` for future sets.

## Proposed Implementation

### 1) Extend data model for tracklists
- Add a new table `video_set_tracks` (normalized, editable) in [`db/setup.ts`](db/setup.ts):
  - `id`, `video_set_id` (FK-like), `track_order`, `title`, `start_seconds`, `source` (`cue`/`manual`), `created_at`, `updated_at`.
- Keep `video_sets` schema unchanged for minimal risk.
- Add migration-safe table creation in setup script (create-if-missing pattern already used there).

### 2) API: include tracks with each set
- Update [`app/api/videoSets/route.ts`](app/api/videoSets/route.ts) to return:
  - `tracks: Array<{ id, track_order, title, start_seconds }>` per set, ordered by `track_order`.
- Keep response backward compatible by preserving existing top-level set fields.

### 3) Parse `.cue` in publish flow (future sets)
- Add optional `--cue <file.cue>` flag to [`scripts/publish-set.sh`](scripts/publish-set.sh).
- After set registration (or via dedicated API), parse cue file and persist tracks for that set.
- Parsing rules:
  - Extract `TITLE` and `INDEX 01 mm:ss:ff`.
  - Convert frame time (`ff`, 75 fps) to seconds.
  - Normalize ordering and trim invalid/duplicate entries.
- If no cue is passed, publish still succeeds (tracks optional).

### 4) Admin editing workflow (manual + corrections)
- Add admin endpoints under existing admin area to:
  - list tracks for a set,
  - upsert/reorder/delete tracks,
  - replace all tracks (for cue re-import).
- Reuse existing auth pattern from admin APIs.
- Add a lightweight editor UI in [`app/admin/page.tsx`](app/admin/page.tsx) (or split component) for per-set track management.

### 5) Sets UX (mobile + desktop)
- In [`app/sets/SetsClient.tsx`](app/sets/SetsClient.tsx):
  - Render tracklist under player (mobile) and in side panel (desktop).
  - Track rows are accessible buttons (`aria-label` with time/title).
  - Clicking/tapping a row calls existing `seekTo(start_seconds, 'button')`.
  - Highlight active track based on `currentTime` range.
  - Auto-scroll active row into view (throttled, no jumpiness).
- Keep controls uncluttered by collapsing long tracklists behind a "Tracklist" section on narrow screens.

### 6) Backfill existing sets
- Add a small backfill script (e.g., `scripts/import-cue-tracklists.ts`) to map known set basenames to cue files and import tracks.
- Script should be idempotent (replace or merge strategy) and safe to rerun.

### 7) Validation and rollout
- Test matrix:
  - desktop click-to-seek,
  - mobile tap-to-seek,
  - fullscreen behavior,
  - no-cue sets fallback,
  - malformed cue handling.
- Roll out in phases:
  1. DB + API + UI read-only support.
  2. Cue ingest in publish script.
  3. Admin editing.
  4. Backfill pass.

## Key Files to Change
- [`db/setup.ts`](db/setup.ts)
- [`app/api/videoSets/route.ts`](app/api/videoSets/route.ts)
- [`app/sets/SetsClient.tsx`](app/sets/SetsClient.tsx)
- [`scripts/publish-set.sh`](scripts/publish-set.sh)
- [`app/admin/page.tsx`](app/admin/page.tsx)
- New: `scripts/import-cue-tracklists.ts` (backfill)
- New: admin tracklist API route(s)
