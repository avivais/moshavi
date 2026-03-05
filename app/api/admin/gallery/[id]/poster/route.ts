import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';
import db from '../../../../../../database';
import { galleryFilePath, resolvePublicPath, extractVideoPoster } from '../../../../../../lib/gallery-utils';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await context.params;
        const idNum = parseInt(id, 10);
        if (!Number.isInteger(idNum) || idNum < 1) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }
        const row = db
            .prepare('SELECT id, src, type FROM gallery_media WHERE id = ?')
            .get(idNum) as { id: number; src: string; type: string } | undefined;
        if (!row || row.type !== 'video') {
            return NextResponse.json({ error: 'Not a video or not found' }, { status: 404 });
        }
        const srcPath = resolvePublicPath(row.src);
        if (!srcPath || !existsSync(srcPath)) {
            return NextResponse.json({ error: 'Video file not found on disk' }, { status: 404 });
        }
        const baseName = path.basename(row.src, path.extname(row.src));
        const thumbName = `${baseName}_thumb.jpg`;
        const thumbPath = galleryFilePath(path.join('thumbs', thumbName));
        const ok = await extractVideoPoster(srcPath, thumbPath);
        if (!ok) {
            return NextResponse.json({ error: 'Could not extract poster (video may be too short or corrupt)' }, { status: 500 });
        }
        const thumbnail_src = `/media/gallery/thumbs/${thumbName}?v=${Date.now()}`;
        db.prepare('UPDATE gallery_media SET thumbnail_src = ? WHERE id = ?').run(thumbnail_src, idNum);
        return NextResponse.json({ thumbnail_src });
    } catch (err) {
        console.error('[gallery poster] re-extract error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Poster extraction failed' },
            { status: 500 }
        );
    }
}
