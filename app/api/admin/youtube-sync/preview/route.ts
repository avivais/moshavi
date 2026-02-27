import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import db from '../../../../../db';

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBREV: Record<string, string> = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };

const YT_DLP_TIMEOUT_MS = 60_000;
const MAX_STDOUT_BYTES = 2 * 1024 * 1024; // 2MB cap

function getMonthIndex(month: string): number {
  const i = FULL_MONTHS.indexOf(month);
  return i >= 0 ? i : -1;
}

/** Parse "Month YYYY" or "Mon YYYY" (e.g. "March 2025", "Feb 2026"). Returns full month name and year or null. */
function parseMonthYear(title: string): { month: string; year: number } | null {
  const trimmed = title.trim();
  const match = trimmed.match(/^(\w+)\s+(\d{4})$/);
  if (!match) return null;
  const [, monthPart, yearStr] = match;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2000 || year > 2100) return null;
  const full = FULL_MONTHS.find(m => m.toLowerCase() === monthPart.toLowerCase());
  if (full) return { month: full, year };
  const abbrev = MONTH_ABBREV[monthPart];
  if (abbrev) return { month: abbrev, year };
  return null;
}

/** Get latest playlist in DB by (year, month) calendar order. */
function getLatestPlaylistInDb(): { year: number; month: string } | null {
  const rows = db.prepare('SELECT year, month FROM playlists').all() as { year: number; month: string }[];
  if (rows.length === 0) return null;
  const withIndex = rows.map(r => ({ ...r, monthIndex: getMonthIndex(r.month) }));
  const valid = withIndex.filter(r => r.monthIndex >= 0);
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.year !== a.year ? b.year - a.year : b.monthIndex - a.monthIndex);
  return { year: valid[0].year, month: valid[0].month };
}

/** Compare (year, month) > latest. */
function isNewerThan(year: number, month: string, latest: { year: number; month: string }): boolean {
  const mi = getMonthIndex(month);
  const li = getMonthIndex(latest.month);
  if (mi < 0 || li < 0) return false;
  return year > latest.year || (year === latest.year && mi > li);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const latestInDb = getLatestPlaylistInDb();

    const channelUrl = process.env.YOUTUBE_CHANNEL_PLAYLISTS_URL || 'https://www.youtube.com/@avivais/playlists';

    const entries = await new Promise<{ id: string; title: string }[]>((resolve, reject) => {
      const proc = spawn('yt-dlp', ['-j', '--flat-playlist', '--no-warnings', channelUrl], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutBytes = 0;
      const chunks: Buffer[] = [];

      proc.stdout?.on('data', (chunk: Buffer) => {
        stdoutBytes += chunk.length;
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          proc.kill('SIGKILL');
          reject(new Error('yt-dlp output too large'));
          return;
        }
        chunks.push(chunk);
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('yt-dlp timed out'));
      }, YT_DLP_TIMEOUT_MS);

      proc.on('close', (code, signal) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null && !signal) {
          reject(new Error(`yt-dlp exited with code ${code}`));
          return;
        }
        const out = Buffer.concat(chunks).toString('utf8');
        const results: { id: string; title: string }[] = [];
        for (const line of out.split('\n')) {
          const s = line.trim();
          if (!s) continue;
          try {
            const obj = JSON.parse(s) as Record<string, unknown>;
            const id = (obj.id ?? obj.playlist_id) as string | undefined;
            const title = obj.title as string | undefined;
            if (id && typeof title === 'string') results.push({ id, title });
          } catch {
            // skip invalid JSON lines
          }
        }
        resolve(results);
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const parsed = entries
      .map(({ id, title }) => {
        const my = parseMonthYear(title);
        if (!my) return null;
        return { embedId: id, title, month: my.month, year: my.year };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const toAdd = latestInDb
      ? parsed.filter(p => isNewerThan(p.year, p.month, latestInDb))
      : parsed;

    // Dedupe by (year, month): keep first occurrence
    const seen = new Set<string>();
    const deduped = toAdd.filter(p => {
      const key = `${p.year}-${p.month}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      latestInDb: latestInDb ? { year: latestInDb.year, month: latestInDb.month } : null,
      toAdd: deduped.map(({ title, embedId, month, year }) => ({ title, embedId, month, year })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch playlists from YouTube';
    console.error('YouTube sync preview error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
