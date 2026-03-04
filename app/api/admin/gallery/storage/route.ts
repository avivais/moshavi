import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import db from '../../../../../database';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

function getDiskStats(): { total: number; used: number; free: number; percent: number } {
    try {
        const output = execSync('df -k /').toString();
        const lines = output.trim().split('\n');
        if (lines.length < 2) return { total: 0, used: 0, free: 0, percent: 0 };
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1], 10) * 1024;
        const used = parseInt(parts[2], 10) * 1024;
        const free = parseInt(parts[3], 10) * 1024;
        const percent = total > 0 ? Math.round((used / total) * 100) : 0;
        return { total, used, free, percent };
    } catch {
        return { total: 0, used: 0, free: 0, percent: 0 };
    }
}

function getThumbsSize(): number {
    const thumbsDir = path.join(process.cwd(), 'public', 'media', 'gallery', 'thumbs');
    let total = 0;
    try {
        const files = readdirSync(thumbsDir);
        for (const file of files) {
            try { total += statSync(path.join(thumbsDir, file)).size; } catch { /* skip */ }
        }
    } catch { /* dir may not exist */ }
    return total;
}

export async function GET(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const disk = getDiskStats();

        const typeStats = db.prepare(
            `SELECT type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as bytes FROM gallery_media GROUP BY type`
        ).all() as Array<{ type: string; count: number; bytes: number }>;

        const images = typeStats.find(r => r.type === 'photo') ?? { count: 0, bytes: 0 };
        const videos = typeStats.find(r => r.type === 'video') ?? { count: 0, bytes: 0 };
        const thumbs = { bytes: getThumbsSize() };
        const totalCount = images.count + videos.count;
        const totalBytes = images.bytes + videos.bytes;

        return NextResponse.json({
            disk,
            gallery: {
                images: { bytes: images.bytes, count: images.count },
                videos: { bytes: videos.bytes, count: videos.count },
                thumbs,
                total: { bytes: totalBytes, count: totalCount },
            },
        });
    } catch (error) {
        console.error('Storage API error:', error);
        return NextResponse.json({ error: 'Failed to get storage info' }, { status: 500 });
    }
}
