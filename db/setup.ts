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
    } finally {
        // No db.close() here to keep it open
    }
}