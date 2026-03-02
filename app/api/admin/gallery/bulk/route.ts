import { NextResponse } from 'next/server';
import db from '../../../../../db';
import { parseBody, galleryBulkSchema } from '../../../../../lib/api-schemas';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

export async function POST(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const parsed = parseBody(galleryBulkSchema, body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { action, ids } = parsed.data;
        const placeholders = ids.map(() => '?').join(',');

        switch (action) {
            case 'add_to_carousel': {
                const maxOrder = db.prepare('SELECT COALESCE(MAX(carousel_order), -1) + 1 AS next_order FROM gallery_media').get() as { next_order: number };
                let order = maxOrder.next_order;
                const update = db.prepare('UPDATE gallery_media SET show_in_carousel = 1, carousel_order = ? WHERE id = ?');
                for (const id of ids) {
                    update.run(order++, id);
                }
                break;
            }
            case 'remove_from_carousel':
                db.prepare(`UPDATE gallery_media SET show_in_carousel = 0 WHERE id IN (${placeholders})`).run(...ids);
                break;
            case 'set_event_tag': {
                const eventTag = 'event_tag' in parsed.data ? (parsed.data.event_tag ?? null) : null;
                const tag = eventTag != null ? String(eventTag).slice(0, 500) : null;
                db.prepare(`UPDATE gallery_media SET event_tag = ? WHERE id IN (${placeholders})`).run(tag, ...ids);
                break;
            }
            case 'hide':
                db.prepare(`UPDATE gallery_media SET visible = 0 WHERE id IN (${placeholders})`).run(...ids);
                break;
            case 'delete': {
                const hard = 'hard' in parsed.data && parsed.data.hard === true;
                if (hard) {
                    db.prepare(`DELETE FROM gallery_media WHERE id IN (${placeholders})`).run(...ids);
                } else {
                    db.prepare(`UPDATE gallery_media SET visible = 0 WHERE id IN (${placeholders})`).run(...ids);
                }
                break;
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin gallery bulk error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Bulk action failed' },
            { status: 500 }
        );
    }
}
