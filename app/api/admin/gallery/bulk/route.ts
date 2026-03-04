import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '../../../../../database';
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
            case 'show':
                db.prepare(`UPDATE gallery_media SET visible = 1 WHERE id IN (${placeholders})`).run(...ids);
                break;
            case 'delete': {
                const hard = 'hard' in parsed.data && parsed.data.hard === true;
                if (hard) {
                    const rows = db.prepare(`SELECT src, thumbnail_src FROM gallery_media WHERE id IN (${placeholders})`).all(...ids) as Array<{ src: string; thumbnail_src: string | null }>;
                    const root = process.cwd();
                    for (const row of rows) {
                        for (const p of [row.src, row.thumbnail_src]) {
                            if (p) { try { await unlink(path.join(root, 'public', p)); } catch { /* file may not exist */ } }
                        }
                    }
                    db.prepare(`DELETE FROM gallery_media WHERE id IN (${placeholders})`).run(...ids);
                } else {
                    db.prepare(`UPDATE gallery_media SET visible = 0 WHERE id IN (${placeholders})`).run(...ids);
                }
                break;
            }
            case 'edit': {
                const { fields } = parsed.data;
                const updates: string[] = [];
                const vals: unknown[] = [];
                if (fields.event_tag !== undefined) { updates.push('event_tag = ?'); vals.push(fields.event_tag != null ? String(fields.event_tag).slice(0, 500) : null); }
                if (fields.caption !== undefined) { updates.push('caption = ?'); vals.push(String(fields.caption).slice(0, 2000)); }
                if (fields.alt !== undefined) { updates.push('alt = ?'); vals.push(String(fields.alt).slice(0, 2000)); }
                if (fields.date !== undefined) { updates.push('date = ?'); vals.push(String(fields.date).slice(0, 200)); }
                if (fields.taken_at !== undefined) { updates.push('taken_at = ?'); vals.push(fields.taken_at != null ? String(fields.taken_at).slice(0, 100) : null); }
                if (updates.length > 0) {
                    db.prepare(`UPDATE gallery_media SET ${updates.join(', ')} WHERE id IN (${placeholders})`).run(...vals, ...ids);
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
