import db from '../db';

(async () => {
    try {
        db.exec('DELETE FROM carousel_images');
        db.exec('DELETE FROM video_sets');
        db.exec('DELETE FROM playlists');

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
            { title: 'MoshAvi #004 - Purim Edition', date: '13.03.2025', src: '/media/sets/MoshAvi-004.mp4', poster: '/media/poster/MoshAvi-004.jpg' },
        ];
        for (const videoSet of videoSets) {
            videoSetsStmt.run(videoSet.title, videoSet.date, videoSet.src, videoSet.poster);
        }

        const playlistsStmt = db.prepare('INSERT INTO playlists (month, year, embedId) VALUES (?, ?, ?)');
        const playlists = [
            { month: 'August', year: 2023, embedId: 'PLeRFN0o7R_lMQweVPurLaTWWiMDusLB2L' },
            { month: 'September', year: 2023, embedId: 'PLeRFN0o7R_lPvVh-7XusF34LHC8hf02K9' },
            { month: 'October', year: 2023, embedId: 'PLeRFN0o7R_lO1-_bf8Wn2ml7ArTx4PU3v' },
            { month: 'November', year: 2023, embedId: 'PLeRFN0o7R_lOMvegW89KLEZtjbHkb4HUT' },
            { month: 'December', year: 2023, embedId: 'PLeRFN0o7R_lNRXBNV2GbG9ZzVZpv9_MYl' },
            { month: 'January', year: 2024, embedId: 'PLeRFN0o7R_lN_dvZNR_-nTF3EEROjTcwd' },
            { month: 'February', year: 2024, embedId: 'PLeRFN0o7R_lPIc9z0gvszJK5vm4x6X3cA' },
            { month: 'March', year: 2024, embedId: 'PLeRFN0o7R_lOMUr1tDy5k228mEbHbjSBK' },
            { month: 'April', year: 2024, embedId: 'PLeRFN0o7R_lMXeX6OaWh9i3TwTXsaV8Qy' },
            { month: 'May', year: 2024, embedId: 'PLeRFN0o7R_lNVQtqdXPQAUrzlgmt3g_e7' },
            { month: 'June', year: 2024, embedId: 'PLeRFN0o7R_lOTpSY0mPr4WpYGrO7cjzS-' },
            { month: 'July', year: 2024, embedId: 'PLeRFN0o7R_lMV-8vmHGLURXsS0YDUE-qB' },
            { month: 'August', year: 2024, embedId: 'PLeRFN0o7R_lPxmcka1HPl6tDW2uJyeWWB' },
            { month: 'September', year: 2024, embedId: 'PLeRFN0o7R_lPQ2VULu8xJR7Kvau6LIUTq' },
            { month: 'October', year: 2024, embedId: 'PLeRFN0o7R_lMsP9Lqoc9UnZDpfhuNam-3' },
            { month: 'November', year: 2024, embedId: 'PLeRFN0o7R_lMxh6N0-4FvIkK2BZLEr50H' },
            { month: 'December', year: 2024, embedId: 'PLeRFN0o7R_lOoy-nkYlpmS4yaxxJ-c_CH' },
            { month: 'January', year: 2025, embedId: 'PLeRFN0o7R_lNO5VUdHDDSiU6gAr-bhmum' },
            { month: 'February', year: 2025, embedId: 'PLeRFN0o7R_lOwAZLh3Kvg59DyhfDRS251' },
        ];
        for (const playlist of playlists) {
            playlistsStmt.run(playlist.month, playlist.year, playlist.embedId);
        }

        console.log('Seeded all tables');
    } catch (err) {
        console.error('Error seeding DB:', err);
    } finally {
        // No db.close() here to keep it open
    }
})();