import { NextResponse } from 'next/server';
import db from '../../../../../db';
import { parseBody, youtubeSyncApplySchema } from '../../../../../lib/api-schemas';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parseBody(youtubeSyncApplySchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const stmt = db.prepare('INSERT INTO playlists (month, year, embedId) VALUES (?, ?, ?)');
    let added = 0;
    for (const p of parsed.data.playlists) {
      stmt.run(p.month, p.year, p.embedId);
      added++;
    }

    return NextResponse.json({ success: true, added });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add playlists';
    console.error('YouTube sync apply error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
