import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

if (require.main === module) {
    try {
        const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='carousel_images'").get();
        if (!exists) {
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
    } catch (err) {
        console.error('Error setting up DB:', err);
    } finally {
        db.close();
    }
}

export { db };