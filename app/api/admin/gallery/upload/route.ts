import { NextResponse } from 'next/server';
import { writeFile, mkdir, stat } from 'fs/promises';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import exifReader from 'exif-reader';
import db from '../../../../../database';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const THUMB_MAX_WIDTH = 400;
const VIDEO_POSTER_TIME_SEC = 3;
const GALLERY_DIR = 'public/media/gallery';
const THUMBS_DIR = 'public/media/gallery/thumbs';

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

function getExt(mime: string): string {
    const map: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
    };
    return map[mime] || '';
}

function isImage(mime: string): boolean {
    return ALLOWED_IMAGE_TYPES.has(mime);
}
function isVideo(mime: string): boolean {
    return ALLOWED_VIDEO_TYPES.has(mime);
}

async function ensureDirs(): Promise<void> {
    const root = process.cwd();
    await mkdir(path.join(root, GALLERY_DIR), { recursive: true });
    await mkdir(path.join(root, THUMBS_DIR), { recursive: true });
}

async function processImage(
    buffer: Buffer,
    mime: string,
    baseName: string,
    root: string
): Promise<{ src: string; thumbnail_src: string; width: number; height: number; takenAt: string | null; fileSize: number }> {
    const ext = getExt(mime);
    const srcPath = path.join(root, GALLERY_DIR, baseName + ext);
    await writeFile(srcPath, buffer);

    const fileSize = (await stat(srcPath)).size;

    const thumbName = `${baseName}_thumb${ext}`;
    const thumbPath = path.join(root, THUMBS_DIR, thumbName);
    const meta = await sharp(buffer)
        .resize(THUMB_MAX_WIDTH, undefined, { withoutEnlargement: true })
        .toFile(thumbPath);
    const fullMeta = await sharp(buffer).metadata();
    const width = fullMeta.width ?? meta.width ?? 0;
    const height = fullMeta.height ?? meta.height ?? 0;

    let takenAt: string | null = null;
    try {
        if (fullMeta.exif) {
            const exifData = exifReader(fullMeta.exif) as unknown as Record<string, Record<string, unknown>>;
            const dto = exifData?.Photo?.DateTimeOriginal ?? exifData?.Exif?.DateTimeOriginal;
            if (dto instanceof Date) {
                takenAt = dto.toISOString();
            } else if (typeof dto === 'string') {
                takenAt = new Date(dto.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')).toISOString();
            }
        }
    } catch {
        // EXIF parsing can fail on some files
    }

    return {
        src: `/media/gallery/${baseName}${ext}`,
        thumbnail_src: `/media/gallery/thumbs/${thumbName}`,
        width,
        height,
        takenAt,
        fileSize,
    };
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

async function getVideoMetadata(filePath: string): Promise<{ width: number; height: number; creationDate: string | null }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return reject(err);
            const stream = data.streams.find((s) => s.width != null && s.height != null);
            const width = stream?.width ?? 1920;
            const height = stream?.height ?? 1080;

            let creationDate: string | null = null;
            const rawDate = data.format?.tags?.creation_time;
            if (rawDate) {
                try { creationDate = new Date(rawDate).toISOString(); } catch { /* ignore */ }
            }
            resolve({ width, height, creationDate });
        });
    });
}

async function processVideo(
    buffer: Buffer,
    mime: string,
    baseName: string,
    root: string
): Promise<{ src: string; thumbnail_src: string | null; width: number; height: number; takenAt: string | null; fileSize: number }> {
    const ext = getExt(mime);
    const srcPath = path.join(root, GALLERY_DIR, baseName + ext);
    await writeFile(srcPath, buffer);

    const fileSize = (await stat(srcPath)).size;

    const thumbName = `${baseName}_thumb.jpg`;
    const thumbPath = path.join(root, THUMBS_DIR, thumbName);
    let thumbnail_src: string | null = `/media/gallery/thumbs/${thumbName}`;
    try {
        await extractVideoPoster(srcPath, thumbPath, VIDEO_POSTER_TIME_SEC);
    } catch (e) {
        console.warn('Video poster extraction failed:', e);
        thumbnail_src = null;
    }
    let width = 1920;
    let height = 1080;
    let takenAt: string | null = null;
    try {
        const meta = await getVideoMetadata(srcPath);
        width = meta.width;
        height = meta.height;
        takenAt = meta.creationDate;
    } catch {
        // keep defaults
    }

    return {
        src: `/media/gallery/${baseName}${ext}`,
        thumbnail_src,
        width,
        height,
        takenAt,
        fileSize,
    };
}

export async function POST(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await ensureDirs();
        const formData = await request.formData();
        const eventTag = (formData.get('event_tag') as string)?.trim() || null;
        const caption = ((formData.get('caption') as string) ?? '').trim().slice(0, 2000);
        const altOverride = ((formData.get('alt') as string) ?? '').trim().slice(0, 2000);
        const date = ((formData.get('date') as string) ?? '').trim().slice(0, 200);
        const takenAtOverride = ((formData.get('taken_at') as string) ?? '').trim() || null;
        const sortMethod = ((formData.get('sort_method') as string) ?? '').trim() || 'manual';

        const files: File[] = [];
        for (const [, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                files.push(value);
            }
        }

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const root = process.cwd();
        const maxOrderRow = db.prepare('SELECT COALESCE(MAX(gallery_order), -1) + 1 AS next_order FROM gallery_media').get() as { next_order: number };
        let nextOrder = maxOrderRow.next_order;

        const insertStmt = db.prepare(
            `INSERT INTO gallery_media (src, thumbnail_src, width, height, type, caption, alt, date, event_tag, taken_at, file_size, show_in_carousel, carousel_order, gallery_order, visible, content_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?)`
        );
        const results: Array<{ id: number; src: string; thumbnail_src: string | null; width: number; height: number }> = [];
        const skippedDuplicates: Array<{ name: string; reason: 'duplicate' }> = [];
        const checkDuplicateStmt = db.prepare('SELECT id FROM gallery_media WHERE content_hash = ? LIMIT 1');

        for (const file of files) {
            const mime = file.type?.toLowerCase() || '';
            if (!isImage(mime) && !isVideo(mime)) {
                return NextResponse.json(
                    { error: `Disallowed file type: ${mime}` },
                    { status: 400 }
                );
            }
            if (file.size > MAX_SIZE) {
                return NextResponse.json(
                    { error: `File too large: ${file.name} (max ${MAX_SIZE / 1024 / 1024} MB)` },
                    { status: 400 }
                );
            }

            const ext = getExt(mime);
            if (!ext) {
                return NextResponse.json({ error: `Unsupported type: ${mime}` }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const contentHash = createHash('sha256').update(buffer).digest('hex');
            const existing = checkDuplicateStmt.get(contentHash) as { id: number } | undefined;
            if (existing) {
                skippedDuplicates.push({ name: file.name, reason: 'duplicate' });
                continue;
            }

            const baseName = randomUUID();
            const alt = altOverride || caption || file.name || '';

            if (isImage(mime)) {
                const result = await processImage(buffer, mime, baseName, root);
                const takenAt = takenAtOverride || result.takenAt;
                insertStmt.run(result.src, result.thumbnail_src, result.width, result.height, 'photo', caption, alt, date, eventTag, takenAt, result.fileSize, nextOrder++, contentHash);
            } else {
                const result = await processVideo(buffer, mime, baseName, root);
                const takenAt = takenAtOverride || result.takenAt;
                insertStmt.run(result.src, result.thumbnail_src, result.width, result.height, 'video', caption, alt, date, eventTag, takenAt, result.fileSize, nextOrder++, contentHash);
            }

            const row = db.prepare('SELECT id, src, thumbnail_src, width, height FROM gallery_media ORDER BY id DESC LIMIT 1').get() as {
                id: number;
                src: string;
                thumbnail_src: string | null;
                width: number;
                height: number;
            };
            results.push(row);
        }

        // Re-sort the batch by taken_at if requested
        if (sortMethod === 'taken_at_desc' && results.length > 1) {
            const batchIds = results.map(r => r.id);
            const placeholders = batchIds.map(() => '?').join(',');
            const rows = db.prepare(`SELECT id, taken_at FROM gallery_media WHERE id IN (${placeholders}) ORDER BY COALESCE(taken_at, '9999') DESC`).all(...batchIds) as Array<{ id: number; taken_at: string | null }>;
            const baseOrder = maxOrderRow.next_order;
            const updateOrder = db.prepare('UPDATE gallery_media SET gallery_order = ? WHERE id = ?');
            rows.forEach((row, i) => updateOrder.run(baseOrder + i, row.id));
        }

        return NextResponse.json({ success: true, items: results, skippedDuplicates }, { status: 201 });
    } catch (error) {
        console.error('Gallery upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
