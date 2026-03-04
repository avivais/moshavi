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

/** Gallery media: optional string fields for display, sanitized length */
const safeString = z.string().max(2000).optional().default('');
const safeStringNullable = z.string().max(500).optional().nullable();

/** Gallery create/update item payload */
export const galleryMediaDataSchema = z.object({
  src: z.string().min(1).max(2000),
  thumbnail_src: z.string().max(2000).optional().nullable(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  type: z.enum(['photo', 'video']),
  caption: safeString,
  alt: safeString,
  date: safeString,
  event_tag: safeStringNullable,
  taken_at: z.string().max(100).optional().nullable(),
  show_in_carousel: z.boolean().optional(),
  carousel_order: z.number().int().min(0).optional(),
  gallery_order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
});

export type GalleryMediaData = z.infer<typeof galleryMediaDataSchema>;

/** POST /api/admin/gallery — create one row (e.g. after URL-only add) */
export const galleryPostSchema = z.object({
  src: galleryMediaDataSchema.shape.src,
  type: galleryMediaDataSchema.shape.type,
  thumbnail_src: galleryMediaDataSchema.shape.thumbnail_src,
  width: galleryMediaDataSchema.shape.width,
  height: galleryMediaDataSchema.shape.height,
  caption: galleryMediaDataSchema.shape.caption,
  alt: galleryMediaDataSchema.shape.alt,
  date: galleryMediaDataSchema.shape.date,
  event_tag: galleryMediaDataSchema.shape.event_tag,
  show_in_carousel: galleryMediaDataSchema.shape.show_in_carousel,
  carousel_order: galleryMediaDataSchema.shape.carousel_order,
  gallery_order: galleryMediaDataSchema.shape.gallery_order,
}).partial({ thumbnail_src: true, width: true, height: true, caption: true, alt: true, date: true, event_tag: true, show_in_carousel: true, carousel_order: true, gallery_order: true });

/** PUT /api/admin/gallery — update by id */
export const galleryPutSchema = z.object({
  id: z.number().int().positive(),
  src: galleryMediaDataSchema.shape.src.optional(),
  thumbnail_src: galleryMediaDataSchema.shape.thumbnail_src.optional(),
  width: galleryMediaDataSchema.shape.width.optional(),
  height: galleryMediaDataSchema.shape.height.optional(),
  caption: galleryMediaDataSchema.shape.caption.optional(),
  alt: galleryMediaDataSchema.shape.alt.optional(),
  date: galleryMediaDataSchema.shape.date.optional(),
  event_tag: galleryMediaDataSchema.shape.event_tag.optional(),
  taken_at: galleryMediaDataSchema.shape.taken_at,
  show_in_carousel: galleryMediaDataSchema.shape.show_in_carousel.optional(),
  carousel_order: galleryMediaDataSchema.shape.carousel_order.optional(),
  gallery_order: galleryMediaDataSchema.shape.gallery_order.optional(),
  visible: galleryMediaDataSchema.shape.visible.optional(),
});

/** DELETE /api/admin/gallery — soft or hard delete */
export const galleryDeleteSchema = z.object({
  id: z.number().int().positive(),
  hard: z.boolean().optional(),
});

/** POST /api/admin/gallery/reorder */
export const galleryReorderSchema = z.object({
  carousel_order: z.array(z.number().int().positive()).optional(),
  gallery_order: z.array(z.number().int().positive()).optional(),
});

/** POST /api/admin/gallery/bulk */
export const galleryBulkSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add_to_carousel'), ids: z.array(z.number().int().positive()) }),
  z.object({ action: z.literal('remove_from_carousel'), ids: z.array(z.number().int().positive()) }),
  z.object({ action: z.literal('set_event_tag'), ids: z.array(z.number().int().positive()), event_tag: z.string().max(500).optional().nullable() }),
  z.object({ action: z.literal('hide'), ids: z.array(z.number().int().positive()) }),
  z.object({ action: z.literal('show'), ids: z.array(z.number().int().positive()) }),
  z.object({ action: z.literal('delete'), ids: z.array(z.number().int().positive()), hard: z.boolean().optional() }),
  z.object({
    action: z.literal('edit'),
    ids: z.array(z.number().int().positive()),
    fields: z.object({
      event_tag: z.string().max(500).optional().nullable(),
      caption: z.string().max(2000).optional(),
      alt: z.string().max(2000).optional(),
      date: z.string().max(200).optional(),
      taken_at: z.string().max(100).optional().nullable(),
    }),
  }),
]);

export type GalleryBulkData = z.infer<typeof galleryBulkSchema>;

/** POST /api/admin/gallery/[id]/poster — change video poster (re-extract frame) */
export const galleryPosterSchema = z.object({
  timeSeconds: z.number().min(0).optional(),
  timePercent: z.number().min(0).max(100).optional(),
});

export type GalleryPosterData = z.infer<typeof galleryPosterSchema>;

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
