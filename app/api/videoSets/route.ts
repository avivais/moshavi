import { NextResponse } from 'next/server';
import db from '../../../db';

interface VideoSet {
    id: number;
    title: string;
    date: string;
    src: string;
    poster: string;
}

export async function GET() {
    try {
        const videoSets = db.prepare<VideoSet>('SELECT * FROM video_sets').all();
        console.log('API returning videoSets:', videoSets);
        return NextResponse.json(videoSets);
    } catch (error) {
        console.error('API GET error (videoSets):', error);
        return NextResponse.json({ error: 'Failed to fetch videoSets' }, { status: 500 });
    }
}