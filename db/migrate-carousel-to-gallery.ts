/**
 * Migration: copy carousel_images into gallery_media.
 * Run once after adding gallery_media table (npx ts-node db/migrate-carousel-to-gallery.ts).
 * Does not drop carousel_images; carousel API will read from gallery_media after this run.
 */

import db from '../database';

function run() {
    const hasGalleryMedia = db
        .prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_media'")
        .get();
    if (!hasGalleryMedia) {
        console.error('gallery_media table does not exist. Run: npx ts-node db/setup.ts');
        process.exit(1);
    }

    const hasCarousel = db
        .prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='carousel_images'")
        .get();
    if (!hasCarousel) {
        console.log('carousel_images table does not exist. Nothing to migrate.');
        return;
    }

    const rows = db.prepare('SELECT id, src, alt, width, height FROM carousel_images ORDER BY id').all() as Array<{
        id: number;
        src: string;
        alt: string;
        width: number;
        height: number;
    }>;

    if (rows.length === 0) {
        console.log('No rows in carousel_images. Done.');
        return;
    }

    const insert = db.prepare(
        `INSERT INTO gallery_media (src, thumbnail_src, width, height, type, caption, alt, date, show_in_carousel, carousel_order, gallery_order, visible)
         VALUES (?, ?, ?, ?, 'photo', ?, ?, '', 1, ?, ?, 1)`
    );

    let order = 0;
    for (const row of rows) {
        insert.run(row.src, row.src, row.width, row.height, row.alt, row.alt, order, order);
        order++;
    }

    console.log(`Migrated ${rows.length} rows from carousel_images to gallery_media.`);
}

run();
