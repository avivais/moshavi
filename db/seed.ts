import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

(async () => {
    try {
        db.exec('DELETE FROM carousel_images');
        db.exec('DELETE FROM video_sets');

        const carouselStmt = db.prepare('INSERT INTO carousel_images (src, alt, width, height) VALUES (?, ?, ?, ?)');
        const carouselImages = [
            { src: '/media/carousel/party-pic-1.jpg', alt: 'Party Pic 1', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-2.jpg', alt: 'Party Pic 2', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-3.jpg', alt: 'Party Pic 3', width: 1200, height: 800 },
            { src: '/media/carousel/party-pic-4.jpg', alt: 'Party Pic 4', width: 1200, height: 800 },
        ];
        for (const image of carouselImages) {
            carouselStmt.run(image.src, image.alt, image.width, image.height);
        }

        const videoSetsStmt = db.prepare('INSERT INTO video_sets (title, date, src, poster) VALUES (?, ?, ?, ?)');
        const videoSets = [
            { title: 'MoshAvi #001', date: '11.08.2023', src: '/media/sets/MoshAvi-001.mp4', poster: '/media/poster/MoshAvi-001.jpg' },
            { title: 'MoshAvi #002', date: '26.04.2024', src: '/media/sets/MoshAvi-002.mp4', poster: '/media/poster/MoshAvi-002.jpg' },
            { title: 'MoshAvi #003', date: '18.10.2024', src: '/media/sets/MoshAvi-003.mp4', poster: '/media/poster/MoshAvi-003.jpg' },
            { title: 'MoshAvi #004 - Purim Edition', date: '13.03.2025', src: '/media/sets/MoshAvi-003.mp4', poster: '/media/poster/MoshAvi-003.jpg' },
        ];
        for (const videoSet of videoSets) {
            videoSetsStmt.run(videoSet.title, videoSet.date, videoSet.src, videoSet.poster);
        }

        console.log('Seeded all tables');
    } catch (err) {
        console.error('Error seeding DB:', err);
    } finally {
        db.close();
    }
})();