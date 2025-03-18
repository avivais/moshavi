import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('./moshavi.db');

interface CarouselImage {
    id: number;
    src: string;
    alt: string;
    width: number;
    height: number;
}

export async function GET() {
    try {
        const images = db.prepare('SELECT * FROM carousel_images').all() as CarouselImage[];
        console.log('API returning images:', images);
        return NextResponse.json(images);
    } catch (error) {
        console.error('API GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { src, alt, width, height } = await request.json();
        db.prepare('INSERT INTO carousel_images (src, alt, width, height) VALUES (?, ?, ?, ?)').run(src, alt, width, height);
        console.log('API added image:', { src, alt, width, height });
        return NextResponse.json({ message: 'Image added' }, { status: 201 });
    } catch (error) {
        console.error('API POST error:', error);
        return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
    }
}