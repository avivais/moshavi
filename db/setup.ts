import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

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
    } catch (err) {
        console.error('Error setting up DB:', err);
    } finally {
        db.close();
    }
}

export { db };