import path from 'path';
import { existsSync } from 'fs';

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
