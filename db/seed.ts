import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

(async () => {
    try {
        db.exec('DELETE FROM carousel_images');
        const stmt = db.prepare('INSERT INTO carousel_images (src, alt, width, height) VALUES (?, ?, ?, ?)');
        const images = [
            { src: '/media/carousel/party-pic-1.jpg', alt: 'Party Pic 1', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-2.jpg', alt: 'Party Pic 2', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-3.jpg', alt: 'Party Pic 3', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-4.jpg', alt: 'Party Pic 4', width: 1200, height: 800 },
        ];
        for (const image of images) {
            stmt.run(image.src, image.alt, image.width, image.height);
        }
        console.log('Seeded carousel images');
    } catch (err) {
        console.error('Error seeding DB:', err);
    } finally {
        db.close();
    }
})();