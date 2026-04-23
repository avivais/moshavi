import { NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { stat } from 'fs/promises';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

const NO_CACHE = { 'Cache-Control': 'no-store' };

function parseSingleRange(rangeHeader: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const startRaw = match[1];
  const endRaw = match[2];

  // Suffix range: bytes=-500 (last 500 bytes)
  if (!startRaw && endRaw) {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    const chunkSize = Math.min(suffixLength, size);
    return { start: size - chunkSize, end: size - 1 };
  }

  if (!startRaw) {
    return null;
  }

  const start = Number.parseInt(startRaw, 10);
  const end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

/**
 * Stream a file from public/<publicRelativeDir>/... with path traversal protection.
 * Used for /media/sets and /media/poster (rewritten from /media/sets/* and /media/poster/*).
 */
export async function servePublicMediaSubpath(
  request: Request,
  publicRelativeDir: string,
  pathSegments: string[] | undefined,
  logLabel: string
): Promise<NextResponse> {
  try {
    if (!pathSegments?.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    }
    const lastSegment = pathSegments[pathSegments.length - 1];
    const segmentWithoutQuery =
      typeof lastSegment === 'string' ? lastSegment.replace(/\?.*/, '') : lastSegment;
    const segments =
      pathSegments.length === 1 ? [segmentWithoutQuery] : [...pathSegments.slice(0, -1), segmentWithoutQuery];
    const relativePath = segments.join('/');
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });
    }
    const root = process.cwd();
    const publicDir = path.join(root, 'public');
    const baseDir = path.join(publicDir, publicRelativeDir);
    const resolved = path.join(baseDir, relativePath);
    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_CACHE });
    }
    if (!existsSync(resolved)) {
      console.warn(`[${logLabel}] file not found:`, { resolved, cwd: root });
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    }
    const st = await stat(resolved);
    if (!st.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    }
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
    };

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const range = parseSingleRange(rangeHeader, st.size);
      if (!range) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${st.size}`,
          },
        });
      }

      const { start, end } = range;
      const chunkSize = end - start + 1;
      const nodeStream = createReadStream(resolved, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${st.size}`,
        },
      });
    }

    const nodeStream = createReadStream(resolved);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        ...baseHeaders,
        'Content-Length': String(st.size),
      },
    });
  } catch (err) {
    console.error(`[${logLabel}] serve error:`, err);
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
  }
}
