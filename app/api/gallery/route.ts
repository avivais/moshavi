import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import db from '../../../database';
import { resolvePublicPath } from '../../../lib/gallery-utils';
export async function GET() {
    try {
        const rows = db
            .prepare(
                `SELECT id, thumbnail_src, src, type, caption, alt, date, event_tag, width, height
                 FROM gallery_media
                 WHERE visible = 1 AND src IS NOT NULL AND TRIM(src) != ''
                 ORDER BY gallery_order ASC, created_at DESC, id ASC`
            )
            .all() as Array<{ id: number; thumbnail_src: string | null; src: string; type: string; caption: string; alt: string; date: string; event_tag: string | null; width: number; height: number }>;
        // Only return items whose main media file exists on disk (avoids ghost placeholders from failed/missing uploads)
        const list = rows.filter((row) => {
            const filePath = resolvePublicPath(row.src);
            return filePath !== null && existsSync(filePath);
        });
        return NextResponse.json(list);
    } catch (error) {
        console.error('Gallery API GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}
