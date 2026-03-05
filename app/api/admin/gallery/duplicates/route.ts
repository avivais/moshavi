import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import db from '../../../../../database';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

/**
 * GET: List duplicate gallery_media groups (same content_hash, count > 1).
 * Admin-only; used for the "Duplicate media" cleanup UI.
 */
export async function GET(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = db
            .prepare(
                `SELECT content_hash, id, src, thumbnail_src, type, caption
                 FROM gallery_media
                 WHERE content_hash IS NOT NULL AND TRIM(content_hash) != ''
                 ORDER BY content_hash, id ASC`
            )
            .all() as Array<{ content_hash: string; id: number; src: string; thumbnail_src: string | null; type: string; caption: string }>;
        const byHash = new Map<string, typeof rows>();
        for (const row of rows) {
            const list = byHash.get(row.content_hash) ?? [];
            list.push(row);
            byHash.set(row.content_hash, list);
        }
        const groups = Array.from(byHash.entries())
            .filter(([, list]) => list.length > 1)
            .map(([content_hash, list]) => ({
                content_hash,
                ids: list.map((r) => r.id),
                count: list.length,
                thumbnail_src: list[0]?.thumbnail_src ?? null,
                type: list[0]?.type ?? 'photo',
                caption_preview: list[0]?.caption?.slice(0, 60) ?? '',
            }));
        return NextResponse.json({ groups });
    } catch (error) {
        console.error('Duplicates GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch duplicates' }, { status: 500 });
    }
}

/**
 * POST: Clean up duplicates — keep one per content_hash (oldest by id), delete the rest and their files.
 * Admin-only.
 */
export async function POST(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = db
            .prepare(
                `SELECT content_hash, id, src, thumbnail_src
                 FROM gallery_media
                 WHERE content_hash IS NOT NULL AND TRIM(content_hash) != ''
                 ORDER BY content_hash, id ASC`
            )
            .all() as Array<{ content_hash: string; id: number; src: string; thumbnail_src: string | null }>;
        const byHash = new Map<string, typeof rows>();
        for (const row of rows) {
            const list = byHash.get(row.content_hash) ?? [];
            list.push(row);
            byHash.set(row.content_hash, list);
        }
        const idsToRemove: number[] = [];
        for (const list of byHash.values()) {
            if (list.length <= 1) continue;
            for (let i = 1; i < list.length; i++) {
                idsToRemove.push(list[i].id);
            }
        }
        if (idsToRemove.length === 0) {
            return NextResponse.json({ success: true, removed: 0 });
        }
        const root = process.cwd();
        for (const id of idsToRemove) {
            const row = db.prepare('SELECT src, thumbnail_src FROM gallery_media WHERE id = ?').get(id) as { src: string; thumbnail_src: string | null } | undefined;
            if (row) {
                for (const p of [row.src, row.thumbnail_src]) {
                    if (p) {
                        const fullPath = path.join(root, 'public', p.replace(/^\//, ''));
                        try {
                            await unlink(fullPath);
                        } catch {
                            /* file may already be missing */
                        }
                    }
                }
            }
        }
        const placeholders = idsToRemove.map(() => '?').join(',');
        db.prepare(`DELETE FROM gallery_media WHERE id IN (${placeholders})`).run(...idsToRemove);
        return NextResponse.json({ success: true, removed: idsToRemove.length });
    } catch (error) {
        console.error('Duplicates cleanup error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
