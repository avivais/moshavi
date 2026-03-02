import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import db from '../../../../../db';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
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
): Promise<{ src: string; thumbnail_src: string; width: number; height: number }> {
    const ext = getExt(mime);
    const srcPath = path.join(root, GALLERY_DIR, baseName + ext);
    await writeFile(srcPath, buffer);

    const thumbName = `${baseName}_thumb${ext}`;
    const thumbPath = path.join(root, THUMBS_DIR, thumbName);
    const meta = await sharp(buffer)
        .resize(THUMB_MAX_WIDTH, undefined, { withoutEnlargement: true })
        .toFile(thumbPath);
    const fullMeta = await sharp(buffer).metadata();
    const width = fullMeta.width ?? meta.width ?? 0;
    const height = fullMeta.height ?? meta.height ?? 0;

    return {
        src: `/media/gallery/${baseName}${ext}`,
        thumbnail_src: `/media/gallery/thumbs/${thumbName}`,
        width,
        height,
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

async function getVideoDimensions(filePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return reject(err);
            const stream = data.streams.find((s) => s.width != null && s.height != null);
            if (stream && stream.width != null && stream.height != null) {
                resolve({ width: stream.width, height: stream.height });
            } else {
                resolve({ width: 1920, height: 1080 });
            }
        });
    });
}

async function processVideo(
    buffer: Buffer,
    mime: string,
    baseName: string,
    root: string
): Promise<{ src: string; thumbnail_src: string | null; width: number; height: number }> {
    const ext = getExt(mime);
    const srcPath = path.join(root, GALLERY_DIR, baseName + ext);
    await writeFile(srcPath, buffer);

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
    try {
        const dims = await getVideoDimensions(srcPath);
        width = dims.width;
        height = dims.height;
    } catch {
        // keep default
    }

    return {
        src: `/media/gallery/${baseName}${ext}`,
        thumbnail_src,
        width,
        height,
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
        const date = ((formData.get('date') as string) ?? '').trim().slice(0, 200);

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
        const insertStmt = db.prepare(
            `INSERT INTO gallery_media (src, thumbnail_src, width, height, type, caption, alt, date, event_tag, show_in_carousel, carousel_order, gallery_order, visible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`
        );
        const results: Array<{ id: number; src: string; thumbnail_src: string | null; width: number; height: number }> = [];

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

            const baseName = randomUUID();
            const buffer = Buffer.from(await file.arrayBuffer());
            const alt = caption || file.name || '';

            if (isImage(mime)) {
                const { src, thumbnail_src, width, height } = await processImage(
                    buffer,
                    mime,
                    baseName,
                    root
                );
                insertStmt.run(src, thumbnail_src, width, height, 'photo', caption, alt, date, eventTag);
            } else {
                const { src, thumbnail_src, width, height } = await processVideo(
                    buffer,
                    mime,
                    baseName,
                    root
                );
                insertStmt.run(src, thumbnail_src, width, height, 'video', caption, alt, date, eventTag);
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

        return NextResponse.json({ success: true, items: results }, { status: 201 });
    } catch (error) {
        console.error('Gallery upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
