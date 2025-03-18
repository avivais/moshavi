import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

interface Playlist {
    id: number;
    month: string;
    year: number;
    embedId: string;
}

export async function GET() {
    try {
        const playlists = db.prepare<Playlist>('SELECT * FROM playlists').all();
        console.log('API returning playlists:', playlists);
        return NextResponse.json(playlists);
    } catch (error) {
        console.error('API GET error (playlists):', error);
        return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
    }
}
