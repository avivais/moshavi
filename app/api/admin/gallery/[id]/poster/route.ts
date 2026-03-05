import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import db from '../../../../../../database';
import { galleryFilePath, resolvePublicPath } from '../../../../../../lib/gallery-utils';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;
const VIDEO_POSTER_TIME_SEC = 3;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

function extractVideoPoster(
    srcPath: string,
    thumbPath: string,
    timeSec: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(srcPath)
            .seekInput(timeSec)
            .outputOptions(['-vframes', '1'])
            .output(thumbPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Re-extract video poster frame and set thumbnail_src for a gallery video.
 * Use when poster extraction failed at upload (thumbnail_src is null).
 */
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
        await extractVideoPoster(srcPath, thumbPath, VIDEO_POSTER_TIME_SEC);
        const thumbnail_src = `/media/gallery/thumbs/${thumbName}`;
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
