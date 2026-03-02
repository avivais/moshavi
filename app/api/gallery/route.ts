import { NextResponse } from 'next/server';
import db from '../../../database';

export async function GET() {
    try {
        const list = db
            .prepare(
                `SELECT id, thumbnail_src, src, type, caption, alt, date, event_tag, width, height
                 FROM gallery_media
                 WHERE visible = 1
                 ORDER BY gallery_order ASC, created_at DESC, id ASC`
            )
            .all();
        return NextResponse.json(list);
    } catch (error) {
        console.error('Gallery API GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}
