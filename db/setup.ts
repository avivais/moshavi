import db from '../db';

if (require.main === module) {
    try {
        const existsCarousel = db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='carousel_images'").get();
        if (!existsCarousel) {
            db.exec(`
                CREATE TABLE carousel_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    src TEXT NOT NULL,
                    alt TEXT NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL
                )
            `);
            console.log('Created carousel_images table');
        } else {
            console.log('carousel_images table already exists');
        }

        const existsGalleryMedia = db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_media'").get();
        if (!existsGalleryMedia) {
            db.exec(`
                CREATE TABLE gallery_media (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    src TEXT NOT NULL,
                    thumbnail_src TEXT,
                    width INTEGER NOT NULL DEFAULT 0,
                    height INTEGER NOT NULL DEFAULT 0,
                    type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
                    caption TEXT NOT NULL DEFAULT '',
                    alt TEXT NOT NULL DEFAULT '',
                    date TEXT NOT NULL DEFAULT '',
                    event_tag TEXT,
                    show_in_carousel INTEGER NOT NULL DEFAULT 0,
                    carousel_order INTEGER NOT NULL DEFAULT 0,
                    gallery_order INTEGER NOT NULL DEFAULT 0,
                    visible INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            `);
            console.log('Created gallery_media table');
        } else {
            console.log('gallery_media table already exists');
        }

        // One-time migration: copy carousel_images into gallery_media so carousel keeps working
        const hasCarousel = db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='carousel_images'").get();
        if (hasCarousel) {
            const count = (db.prepare('SELECT COUNT(*) AS n FROM gallery_media').get() as { n: number }).n;
            const carouselRows = db.prepare('SELECT id, src, alt, width, height FROM carousel_images ORDER BY id').all() as Array<{ id: number; src: string; alt: string; width: number; height: number }>;
            if (count === 0 && carouselRows.length > 0) {
                const insert = db.prepare(
                    `INSERT INTO gallery_media (src, thumbnail_src, width, height, type, caption, alt, date, show_in_carousel, carousel_order, gallery_order, visible)
                     VALUES (?, ?, ?, ?, 'photo', ?, ?, '', 1, ?, ?, 1)`
                );
                let order = 0;
                for (const row of carouselRows) {
                    insert.run(row.src, row.src, row.width, row.height, row.alt, row.alt, order, order);
                    order++;
                }
                console.log(`Migrated ${carouselRows.length} rows from carousel_images to gallery_media.`);
            }
        }

        const existsVideoSets = db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='video_sets'").get();
        if (!existsVideoSets) {
            db.exec(`
                CREATE TABLE video_sets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    date TEXT NOT NULL,
                    src TEXT NOT NULL,
                    poster TEXT NOT NULL
                )
            `);
            console.log('Created video_sets table');
        } else {
            console.log('video_sets table already exists');
        }

        const existsPlaylists = db.prepare<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='playlists'").get();
        if (!existsPlaylists) {
            db.exec(`
                CREATE TABLE playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    embedId TEXT NOT NULL
                )
            `);
            console.log('Created playlists table');
        } else {
            console.log('playlists table already exists');
        }
    } catch (err) {
        console.error('Error setting up DB:', err);
    }
}