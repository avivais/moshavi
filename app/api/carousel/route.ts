import { NextResponse } from 'next/server';
import db from '../../../db';

interface CarouselImage {
    id: number;
    src: string;
    alt: string;
    width: number;
    height: number;
}

export async function GET() {
    try {
        const rows = db
            .prepare(
                `SELECT id, src, alt, width, height FROM gallery_media
                 WHERE show_in_carousel = 1 AND visible = 1 AND type = 'photo'
                 ORDER BY carousel_order ASC, id ASC`
            )
            .all() as CarouselImage[];
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Carousel API GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }
}
