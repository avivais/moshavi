import { NextResponse } from 'next/server'
import db from '../../../db'
import { parseBody, adminPostSchema, adminPutSchema, adminDeleteSchema } from '../../../lib/api-schemas'

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const carouselImages = db.prepare('SELECT * FROM carousel_images').all()
        const videoSets = db.prepare('SELECT * FROM video_sets').all()
        const playlists = db.prepare('SELECT * FROM playlists').all()

        return NextResponse.json({ carouselImages, videoSets, playlists })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
        console.error('Admin GET error:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = parseBody(adminPostSchema, body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            )
        }

        const { type, data } = parsed.data
        switch (type) {
            case 'carousel':
                db.prepare('INSERT INTO carousel_images (src, alt, width, height) VALUES (?, ?, ?, ?)').run(data.src, data.alt, data.width, data.height)
                break
            case 'videoSet':
                db.prepare('INSERT INTO video_sets (title, date, src, poster) VALUES (?, ?, ?, ?)').run(data.title, data.date, data.src, data.poster)
                break
            case 'playlist':
                db.prepare('INSERT INTO playlists (month, year, embedId) VALUES (?, ?, ?)').run(data.month, data.year, data.embedId)
                break
        }
        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add entry'
        console.error('Admin POST error:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = parseBody(adminPutSchema, body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            )
        }

        const { type, id, data } = parsed.data
        switch (type) {
            case 'carousel':
                db.prepare('UPDATE carousel_images SET src = ?, alt = ?, width = ?, height = ? WHERE id = ?').run(data.src, data.alt, data.width, data.height, id)
                break
            case 'videoSet':
                db.prepare('UPDATE video_sets SET title = ?, date = ?, src = ?, poster = ? WHERE id = ?').run(data.title, data.date, data.src, data.poster, id)
                break
            case 'playlist':
                db.prepare('UPDATE playlists SET month = ?, year = ?, embedId = ? WHERE id = ?').run(data.month, data.year, data.embedId, id)
                break
        }
        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update entry'
        console.error('Admin PUT error:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = parseBody(adminDeleteSchema, body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.issues },
                { status: 400 }
            )
        }

        const { type, id } = parsed.data
        switch (type) {
            case 'carousel':
                db.prepare('DELETE FROM carousel_images WHERE id = ?').run(id)
                break
            case 'videoSet':
                db.prepare('DELETE FROM video_sets WHERE id = ?').run(id)
                break
            case 'playlist':
                db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
                break
        }
        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry'
        console.error('Admin DELETE error:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}