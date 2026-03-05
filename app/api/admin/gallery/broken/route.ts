import { NextResponse } from 'next/server';
import db from '../../../../../database';
import { publicFileExists } from '../../../../../lib/gallery-utils';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

type GalleryRow = {
    id: number;
    src: string;
    thumbnail_src: string | null;
    type: string;
    caption: string;
    alt: string;
    date: string;
    event_tag: string | null;
    visible: number;
    created_at?: string;
};

/**
 * GET: List gallery_media rows whose main media file is missing on disk (broken/orphaned).
 * Admin-only; used for the "Broken media" cleanup UI.
 */
export async function GET(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = db
            .prepare(
                `SELECT id, src, thumbnail_src, type, caption, alt, date, event_tag, visible, created_at
                 FROM gallery_media
                 WHERE src IS NOT NULL AND TRIM(src) != ''`
            )
            .all() as GalleryRow[];
        const broken = rows.filter((row) => !publicFileExists(row.src));
        return NextResponse.json({ items: broken });
    } catch (error) {
        console.error('Broken gallery GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch broken media' }, { status: 500 });
    }
}

/**
 * DELETE: Permanently remove all gallery_media rows whose main media file is missing.
 * Does not try to delete files (they are already missing). Admin-only.
 */
export async function DELETE(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = db
            .prepare("SELECT id, src FROM gallery_media WHERE src IS NOT NULL AND TRIM(src) != ''")
            .all() as Array<{ id: number; src: string }>;
        const brokenIds = rows.filter((row) => !publicFileExists(row.src)).map((r) => r.id);
        if (brokenIds.length === 0) {
            return NextResponse.json({ success: true, deleted: 0 });
        }
        const placeholders = brokenIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM gallery_media WHERE id IN (${placeholders})`).run(...brokenIds);
        return NextResponse.json({ success: true, deleted: brokenIds.length });
    } catch (error) {
        console.error('Broken gallery DELETE error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
