/**
 * Backfill content_hash for existing gallery_media rows (NULL or empty).
 * Run once after adding content_hash column: npm run db:backfill-hashes
 * Reads each file from disk, computes SHA-256, updates the row.
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import db from '../database';
import { resolvePublicPath } from '../lib/gallery-utils';

function run() {
    const rows = db
        .prepare(
            `SELECT id, src FROM gallery_media
             WHERE (content_hash IS NULL OR TRIM(COALESCE(content_hash, '')) = '')
             AND src IS NOT NULL AND TRIM(src) != ''`
        )
        .all() as Array<{ id: number; src: string }>;

    if (rows.length === 0) {
        console.log('No gallery_media rows missing content_hash. Done.');
        return;
    }

    const updateStmt = db.prepare('UPDATE gallery_media SET content_hash = ? WHERE id = ?');
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
        const filePath = resolvePublicPath(row.src);
        if (!filePath || !existsSync(filePath)) {
            console.warn(`Skip id=${row.id}: file not found ${row.src}`);
            skipped++;
            continue;
        }
        try {
            const buffer = readFileSync(filePath);
            const hash = createHash('sha256').update(buffer).digest('hex');
            updateStmt.run(hash, row.id);
            updated++;
        } catch (err) {
            console.warn(`Skip id=${row.id}: ${err instanceof Error ? err.message : String(err)}`);
            skipped++;
        }
    }

    console.log(`Backfilled content_hash: ${updated} updated, ${skipped} skipped.`);
}

run();
