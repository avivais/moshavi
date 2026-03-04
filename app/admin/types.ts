export interface GalleryMedia {
    id: number
    src: string
    thumbnail_src: string | null
    width: number
    height: number
    type: 'photo' | 'video'
    caption: string
    alt: string
    date: string
    event_tag: string | null
    taken_at: string | null
    file_size: number
    show_in_carousel: number
    carousel_order: number
    gallery_order: number
    visible: number
    created_at?: string
}
