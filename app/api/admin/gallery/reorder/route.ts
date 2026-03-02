import { NextResponse } from 'next/server';
import db from '../../../../../database';
import { parseBody, galleryReorderSchema } from '../../../../../lib/api-schemas';

const BEARER = `Bearer ${process.env.ADMIN_PASSWORD}`;

function auth(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !!authHeader && authHeader === BEARER;
}

export async function PATCH(request: Request) {
    if (!auth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const parsed = parseBody(galleryReorderSchema, body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { carousel_order: carouselOrder, gallery_order: galleryOrder } = parsed.data;

        if (carouselOrder && carouselOrder.length > 0) {
            const updateCarousel = db.prepare('UPDATE gallery_media SET carousel_order = ? WHERE id = ?');
            carouselOrder.forEach((id, index) => {
                updateCarousel.run(index, id);
            });
        }
        if (galleryOrder && galleryOrder.length > 0) {
            const updateGallery = db.prepare('UPDATE gallery_media SET gallery_order = ? WHERE id = ?');
            galleryOrder.forEach((id, index) => {
                updateGallery.run(index, id);
            });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin gallery reorder error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Reorder failed' },
            { status: 500 }
        );
    }
}
