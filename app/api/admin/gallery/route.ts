import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '../../../../database';
import {
    parseBody,
    galleryPostSchema,
    galleryPutSchema,
} from '../../../../lib/api-schemas';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

export async function GET(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const list = db
            .prepare(
                `SELECT id, src, thumbnail_src, width, height, type, caption, alt, date, event_tag,
                        taken_at, file_size, duration, show_in_carousel, carousel_order, gallery_order, visible, created_at
                 FROM gallery_media ORDER BY gallery_order ASC, id ASC`
            )
            .all();
        return NextResponse.json(list);
    } catch (error) {
        console.error('Admin gallery GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const parsed = parseBody(galleryPostSchema, body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const d = parsed.data;
        const caption = (d.caption ?? '').toString().slice(0, 2000);
        const alt = (d.alt ?? '').toString().slice(0, 2000);
        const date = (d.date ?? '').toString().slice(0, 200);
        const eventTag = d.event_tag != null ? String(d.event_tag).slice(0, 500) : null;
        const showInCarousel = d.show_in_carousel ? 1 : 0;
        const carouselOrder = Math.max(0, d.carousel_order ?? 0);
        const galleryOrder = Math.max(0, d.gallery_order ?? 0);
        const width = Math.max(0, d.width ?? 0);
        const height = Math.max(0, d.height ?? 0);

        db.prepare(
            `INSERT INTO gallery_media (src, thumbnail_src, width, height, type, caption, alt, date, event_tag, show_in_carousel, carousel_order, gallery_order, visible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        ).run(
            d.src,
            d.thumbnail_src ?? null,
            width,
            height,
            d.type,
            caption,
            alt,
            date,
            eventTag,
            showInCarousel,
            carouselOrder,
            galleryOrder
        );
        const row = db.prepare('SELECT * FROM gallery_media ORDER BY id DESC LIMIT 1').get();
        return NextResponse.json({ success: true, item: row }, { status: 201 });
    } catch (error) {
        console.error('Admin gallery POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Create failed' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const parsed = parseBody(galleryPutSchema, body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { id, ...d } = parsed.data;
        const updates: string[] = [];
        const values: unknown[] = [];

        if (d.src !== undefined) {
            updates.push('src = ?');
            values.push(d.src);
        }
        if (d.thumbnail_src !== undefined) {
            updates.push('thumbnail_src = ?');
            values.push(d.thumbnail_src);
        }
        if (d.width !== undefined) {
            updates.push('width = ?');
            values.push(Math.max(0, d.width));
        }
        if (d.height !== undefined) {
            updates.push('height = ?');
            values.push(Math.max(0, d.height));
        }
        if (d.caption !== undefined) {
            updates.push('caption = ?');
            values.push(String(d.caption).slice(0, 2000));
        }
        if (d.alt !== undefined) {
            updates.push('alt = ?');
            values.push(String(d.alt).slice(0, 2000));
        }
        if (d.date !== undefined) {
            updates.push('date = ?');
            values.push(String(d.date).slice(0, 200));
        }
        if (d.event_tag !== undefined) {
            updates.push('event_tag = ?');
            values.push(d.event_tag != null ? String(d.event_tag).slice(0, 500) : null);
        }
        if (d.taken_at !== undefined) {
            updates.push('taken_at = ?');
            values.push(d.taken_at != null ? String(d.taken_at).slice(0, 100) : null);
        }
        if (d.show_in_carousel !== undefined) {
            updates.push('show_in_carousel = ?');
            values.push(d.show_in_carousel ? 1 : 0);
        }
        if (d.carousel_order !== undefined) {
            updates.push('carousel_order = ?');
            values.push(Math.max(0, d.carousel_order));
        }
        if (d.gallery_order !== undefined) {
            updates.push('gallery_order = ?');
            values.push(Math.max(0, d.gallery_order));
        }
        if (d.visible !== undefined) {
            updates.push('visible = ?');
            values.push(d.visible ? 1 : 0);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }
        values.push(id);
        db.prepare(`UPDATE gallery_media SET ${updates.join(', ')} WHERE id = ?`).run(
            ...(values as (string | number | null)[])
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin gallery PUT error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Update failed' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const url = new URL(request.url);
        const idParam = url.searchParams.get('id');
        const id = idParam ? parseInt(idParam, 10) : NaN;
        if (!Number.isInteger(id) || id < 1) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }
        const hard = url.searchParams.get('hard') === '1' || url.searchParams.get('hard') === 'true';

        if (hard) {
            const row = db.prepare('SELECT src, thumbnail_src FROM gallery_media WHERE id = ?').get(id) as { src: string; thumbnail_src: string | null } | undefined;
            if (row) {
                const root = process.cwd();
                for (const p of [row.src, row.thumbnail_src]) {
                    if (p) { try { await unlink(path.join(root, 'public', p)); } catch { /* file may not exist */ } }
                }
            }
            db.prepare('DELETE FROM gallery_media WHERE id = ?').run(id);
        } else {
            db.prepare('UPDATE gallery_media SET visible = 0 WHERE id = ?').run(id);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin gallery DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}
