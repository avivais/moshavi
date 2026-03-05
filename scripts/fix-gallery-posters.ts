/**
 * Fix gallery videos:
 * 1. Re-extract poster for videos with missing/broken thumbnail
 * 2. Backfill duration for videos with null duration
 * Run during deploy or manually: npm run fix-posters
 */

import path from 'path';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import db from '../database';
import { galleryFilePath, resolvePublicPath, extractVideoPoster } from '../lib/gallery-utils';

function getVideoDuration(filePath: string): Promise<number | null> {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return resolve(null);
            const dur = data.format?.duration;
            resolve(typeof dur === 'number' ? dur : null);
        });
    });
}

async function run() {
    const allVideos = db
        .prepare(
            `SELECT id, src, thumbnail_src, duration FROM gallery_media
             WHERE type = 'video'
             AND src IS NOT NULL AND TRIM(src) != ''`
        )
        .all() as Array<{ id: number; src: string; thumbnail_src: string | null; duration: number | null }>;

    // --- Fix posters ---
    const needPoster = allVideos.filter((row) => {
        const hasValidThumb = row.thumbnail_src != null && row.thumbnail_src.trim() !== '';
        if (!hasValidThumb) return true;
        const thumbPath = resolvePublicPath(row.thumbnail_src!);
        return !thumbPath || !existsSync(thumbPath);
    });

    const updateThumb = db.prepare('UPDATE gallery_media SET thumbnail_src = ? WHERE id = ?');
    let posterFixed = 0;
    let posterSkipped = 0;

    for (const row of needPoster) {
        const srcPath = resolvePublicPath(row.src);
        if (!srcPath || !existsSync(srcPath)) {
            console.warn(`Poster skip id=${row.id}: video not found`);
            posterSkipped++;
            continue;
        }
        const baseName = path.basename(row.src, path.extname(row.src));
        const thumbName = `${baseName}_thumb.jpg`;
        const thumbPath = galleryFilePath(path.join('thumbs', thumbName));
        const ok = await extractVideoPoster(srcPath, thumbPath);
        if (ok) {
            updateThumb.run(`/media/gallery/thumbs/${thumbName}`, row.id);
            posterFixed++;
            console.log(`Fixed poster id=${row.id}`);
        } else {
            console.warn(`Poster skip id=${row.id}: extraction failed`);
            posterSkipped++;
        }
    }
    console.log(`Posters: ${posterFixed} fixed, ${posterSkipped} skipped.`);

    // --- Backfill duration ---
    const needDuration = allVideos.filter((row) => row.duration == null);
    const updateDur = db.prepare('UPDATE gallery_media SET duration = ? WHERE id = ?');
    let durFilled = 0;

    for (const row of needDuration) {
        const srcPath = resolvePublicPath(row.src);
        if (!srcPath || !existsSync(srcPath)) continue;
        const dur = await getVideoDuration(srcPath);
        if (dur != null) {
            updateDur.run(dur, row.id);
            durFilled++;
        }
    }
    if (durFilled > 0) console.log(`Duration: backfilled ${durFilled} videos.`);
    else if (needDuration.length === 0) console.log('Duration: all videos have duration.');
}

run().catch((err) => {
    console.error('fix-gallery-posters failed:', err);
    process.exit(1);
});
