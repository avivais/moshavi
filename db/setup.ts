import db from '../database';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

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

        // Add taken_at column if missing
        try { db.exec('ALTER TABLE gallery_media ADD COLUMN taken_at TEXT'); console.log('Added taken_at column'); } catch { console.log('taken_at column already exists'); }

        // Add file_size column if missing
        try { db.exec('ALTER TABLE gallery_media ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0'); console.log('Added file_size column'); } catch { console.log('file_size column already exists'); }

        // Add content_hash column for duplicate detection (SHA-256 hex)
        try { db.exec('ALTER TABLE gallery_media ADD COLUMN content_hash TEXT'); console.log('Added content_hash column'); } catch { console.log('content_hash column already exists'); }

        // Add duration column for video length (seconds)
        try { db.exec('ALTER TABLE gallery_media ADD COLUMN duration REAL'); console.log('Added duration column'); } catch { console.log('duration column already exists'); }

        // Backfill file_size from disk for any rows still at 0
        const zeroSizeRows = db.prepare('SELECT id, src FROM gallery_media WHERE file_size = 0').all() as Array<{ id: number; src: string }>;
        if (zeroSizeRows.length > 0) {
            const updateStmt = db.prepare('UPDATE gallery_media SET file_size = ? WHERE id = ?');
            let backfilled = 0;
            for (const row of zeroSizeRows) {
                const filePath = path.join(process.cwd(), 'public', row.src);
                try {
                    const stat = fs.statSync(filePath);
                    updateStmt.run(stat.size, row.id);
                    backfilled++;
                } catch {
                    console.warn(`Backfill: missing file for id=${row.id} path=${filePath}`);
                }
            }
            if (backfilled > 0) console.log(`Backfilled file_size for ${backfilled} rows`);
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

        // Migrate carousel files to gallery folder (physical files + DB refs)
        const carouselFileRows = db.prepare("SELECT id, src, thumbnail_src FROM gallery_media WHERE src LIKE '/media/carousel/%'").all() as Array<{ id: number; src: string; thumbnail_src: string | null }>;
        if (carouselFileRows.length > 0) {
            const root = process.cwd();
            const galleryDir = path.join(root, 'public', 'media', 'gallery');
            const thumbsDir = path.join(root, 'public', 'media', 'gallery', 'thumbs');
            fs.mkdirSync(galleryDir, { recursive: true });
            fs.mkdirSync(thumbsDir, { recursive: true });
            const updateStmt = db.prepare('UPDATE gallery_media SET src = ?, thumbnail_src = ?, file_size = ? WHERE id = ?');
            let migrated = 0;
            for (const row of carouselFileRows) {
                const srcFile = path.join(root, 'public', row.src);
                if (!fs.existsSync(srcFile)) { console.warn(`Carousel migrate: missing ${srcFile}`); continue; }
                const filename = path.basename(row.src);
                const destFile = path.join(galleryDir, filename);
                const thumbFile = path.join(thumbsDir, filename);
                try {
                    fs.copyFileSync(srcFile, destFile);
                    const fileSize = fs.statSync(destFile).size;
                    try { sharp(destFile).resize(400, undefined, { withoutEnlargement: true }).toFile(thumbFile); } catch { /* thumb generation optional */ }
                    const newSrc = `/media/gallery/${filename}`;
                    const newThumb = `/media/gallery/thumbs/${filename}`;
                    updateStmt.run(newSrc, newThumb, fileSize, row.id);
                    migrated++;
                } catch (e) {
                    console.warn(`Carousel migrate: failed for id=${row.id}:`, e);
                }
            }
            if (migrated > 0) console.log(`Migrated ${migrated} carousel files to gallery folder`);
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