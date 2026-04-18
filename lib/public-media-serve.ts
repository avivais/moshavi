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

/**
 * Stream a file from public/<publicRelativeDir>/... with path traversal protection.
 * Used for /media/sets and /media/poster (rewritten from /media/sets/* and /media/poster/*).
 */
export async function servePublicMediaSubpath(
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
    const nodeStream = createReadStream(resolved);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(st.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error(`[${logLabel}] serve error:`, err);
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
  }
}
