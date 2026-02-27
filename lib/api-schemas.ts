import { z } from 'zod';

/** Carousel image payload for POST /api/carousel */
export const carouselPostSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type CarouselPostData = z.infer<typeof carouselPostSchema>;

/** Admin: carousel item data (create/update) */
export const carouselDataSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** Admin: video set item data (create/update) */
export const videoSetDataSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  src: z.string().min(1),
  poster: z.string().min(1),
});

/** Admin: playlist item data (create/update) */
export const playlistDataSchema = z.object({
  month: z.string().min(1),
  year: z.number().int().positive(),
  embedId: z.string().min(1),
});

const adminTypeSchema = z.enum(['carousel', 'videoSet', 'playlist']);

/** Admin POST: { type, data } */
export const adminPostSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('carousel'), data: carouselDataSchema }),
  z.object({ type: z.literal('videoSet'), data: videoSetDataSchema }),
  z.object({ type: z.literal('playlist'), data: playlistDataSchema }),
]);

/** Admin PUT: { type, id, data } */
export const adminPutSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('carousel'), id: z.number().int().positive(), data: carouselDataSchema }),
  z.object({ type: z.literal('videoSet'), id: z.number().int().positive(), data: videoSetDataSchema }),
  z.object({ type: z.literal('playlist'), id: z.number().int().positive(), data: playlistDataSchema }),
]);

/** Admin DELETE: { type, id } */
export const adminDeleteSchema = z.object({
  type: adminTypeSchema,
  id: z.number().int().positive(),
});

/** YouTube sync apply: one playlist item (month full name, year, embedId) */
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export const youtubeSyncPlaylistItemSchema = z.object({
  month: z.enum(FULL_MONTHS),
  year: z.number().int().positive(),
  embedId: z.string().min(1),
});

/** YouTube sync apply: body with array of playlists to add */
export const youtubeSyncApplySchema = z.object({
  playlists: z.array(youtubeSyncPlaylistItemSchema),
});

export type YoutubeSyncApplyData = z.infer<typeof youtubeSyncApplySchema>;

/**
 * Parse request body with a Zod schema. Use in API routes for validation.
 * Returns { success: true, data } or { success: false, error }.
 */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
