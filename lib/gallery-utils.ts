import path from 'path';
import { existsSync, statSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Resolve a public URL path (e.g. /media/gallery/foo.jpg) to an absolute filesystem path
 * under public/, and ensure it stays there to prevent path traversal.
 */
export function resolvePublicPath(relativePath: string): string | null {
    if (!relativePath || typeof relativePath !== 'string') return null;
    const trimmed = relativePath.trim().replace(/^\/+/, '');
    if (!trimmed) return null;
    const normalized = path.normalize(trimmed).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
    const root = process.cwd();
    const publicDir = path.join(root, 'public');
    const resolved = path.join(publicDir, normalized);
    if (!resolved.startsWith(publicDir + path.sep) && resolved !== publicDir) return null;
    return resolved;
}

export function publicFileExists(relativePath: string): boolean {
    const filePath = resolvePublicPath(relativePath);
    return filePath !== null && existsSync(filePath);
}

/** Absolute path for a file under public/media/gallery (for upload writes). Same base as resolvePublicPath. */
export function galleryFilePath(filename: string): string {
    const root = process.cwd();
    return path.join(root, 'public', 'media', 'gallery', filename);
}

const POSTER_SEEK_TIMES = [3, 1, 0];

function ffmpegExtractFrame(srcPath: string, thumbPath: string, timeSec: number): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(srcPath)
            .seekInput(timeSec)
            .outputOptions(['-vframes', '1'])
            .output(thumbPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Extract a poster frame from a video. Tries multiple seek times (3s, 1s, 0s)
 * to handle short videos gracefully. Returns true if a non-empty file was written.
 */
export async function extractVideoPoster(srcPath: string, thumbPath: string): Promise<boolean> {
    for (const t of POSTER_SEEK_TIMES) {
        try {
            await ffmpegExtractFrame(srcPath, thumbPath, t);
            if (existsSync(thumbPath) && statSync(thumbPath).size > 0) {
                return true;
            }
        } catch {
            // try next seek time
        }
    }
    return false;
}
