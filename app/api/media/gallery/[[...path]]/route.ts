import { NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { stat } from 'fs/promises';

const GALLERY_PUBLIC = 'media/gallery';
const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
};

/**
 * Serve gallery media from public/media/gallery (same path upload writes to).
 * Ensures files are found regardless of static serving quirks.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ path?: string[] }> }
) {
    try {
        const { path: pathSegments } = await context.params;
        if (!pathSegments?.length) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const relativePath = pathSegments.join('/');
        if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const root = process.cwd();
        const publicDir = path.join(root, 'public');
        const galleryDir = path.join(publicDir, GALLERY_PUBLIC);
        const resolved = path.join(galleryDir, relativePath);
        if (!resolved.startsWith(galleryDir + path.sep) && resolved !== galleryDir) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!existsSync(resolved)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const st = await stat(resolved);
        if (!st.isFile()) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
        console.error('[media/gallery] serve error:', err);
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
