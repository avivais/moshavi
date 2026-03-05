/**
 * Fix gallery videos with missing poster (thumbnail_src IS NULL, or thumb file missing on disk).
 * Re-extracts a frame (tries 3s, 1s, 0s for short videos) and updates thumbnail_src.
 * Run during deploy or manually: npm run fix-posters
 */

import path from 'path';
import { existsSync } from 'fs';
import db from '../database';
import { galleryFilePath, resolvePublicPath, extractVideoPoster } from '../lib/gallery-utils';

async function run() {
    const rows = db
        .prepare(
            `SELECT id, src, thumbnail_src FROM gallery_media
             WHERE type = 'video'
             AND src IS NOT NULL AND TRIM(src) != ''`
        )
        .all() as Array<{ id: number; src: string; thumbnail_src: string | null }>;

    const needFix = rows.filter((row) => {
        const hasValidThumb = row.thumbnail_src != null && row.thumbnail_src.trim() !== '';
        if (!hasValidThumb) return true;
        const thumbPath = resolvePublicPath(row.thumbnail_src!);
        return !thumbPath || !existsSync(thumbPath);
    });

    if (needFix.length === 0) {
        console.log('No gallery videos missing poster. Done.');
        return;
    }

    const updateStmt = db.prepare('UPDATE gallery_media SET thumbnail_src = ? WHERE id = ?');
    let fixed = 0;
    let skipped = 0;

    for (const row of needFix) {
        const srcPath = resolvePublicPath(row.src);
        if (!srcPath || !existsSync(srcPath)) {
            console.warn(`Skip id=${row.id}: video file not found ${row.src}`);
            skipped++;
            continue;
        }
        const baseName = path.basename(row.src, path.extname(row.src));
        const thumbName = `${baseName}_thumb.jpg`;
        const thumbPath = galleryFilePath(path.join('thumbs', thumbName));
        const ok = await extractVideoPoster(srcPath, thumbPath);
        if (ok) {
            const thumbnail_src = `/media/gallery/thumbs/${thumbName}`;
            updateStmt.run(thumbnail_src, row.id);
            fixed++;
            console.log(`Fixed poster id=${row.id} -> ${thumbnail_src}`);
        } else {
            console.warn(`Skip id=${row.id}: ffmpeg could not extract any frame`);
            skipped++;
        }
    }

    console.log(`fix-gallery-posters: ${fixed} fixed, ${skipped} skipped.`);
}

run().catch((err) => {
    console.error('fix-gallery-posters failed:', err);
    process.exit(1);
});
