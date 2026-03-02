'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'galleryViewMode';
type ViewMode = 'grid' | 'timeline' | 'albums';

function GalleryCell({ thumb, alt, ratio, onClick }: { thumb: string; alt: string; ratio: number; onClick: () => void }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <button
            type="button"
            className="w-full rounded-lg overflow-hidden bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black text-left"
            onClick={onClick}
            style={{ aspectRatio: ratio }}
        >
            <span className="block w-full h-full relative">
                {!loaded && (
                    <span className="absolute inset-0 bg-gray-700 animate-pulse" aria-hidden="true" />
                )}
                <img
                    src={thumb || ''}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                />
            </span>
        </button>
    );
}

interface GalleryItem {
    id: number;
    thumbnail_src: string | null;
    src: string;
    type: 'photo' | 'video';
    caption: string;
    alt: string;
    date: string;
    event_tag: string | null;
    width: number;
    height: number;
}

export default function GalleryClient() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window === 'undefined') return 'grid';
        return (localStorage.getItem(STORAGE_KEY) as ViewMode) || 'grid';
    });
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch('/api/gallery')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load gallery');
                return res.json();
            })
            .then((data) => {
                if (mounted) setItems(data);
            })
            .catch((err) => {
                if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, viewMode);
        } catch {
            // ignore
        }
    }, [viewMode]);

    const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
    const closeLightbox = useCallback(() => setLightboxIndex(null), []);
    const goPrev = useCallback(() => {
        setLightboxIndex((i) => (i == null ? null : i <= 0 ? items.length - 1 : i - 1));
    }, [items.length]);
    const goNext = useCallback(() => {
        setLightboxIndex((i) => (i == null ? null : i >= items.length - 1 ? 0 : i + 1));
    }, [items.length]);

    const flatItems = items;
    const byDate = items.reduce<Record<string, GalleryItem[]>>((acc, item) => {
        const key = item.date || 'No date';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
    const dateGroups = Object.entries(byDate).sort(([a], [b]) => (a === 'No date' ? 1 : b === 'No date' ? -1 : 0));

    const byAlbum = items.reduce<Record<string, GalleryItem[]>>((acc, item) => {
        const key = item.event_tag?.trim() || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
    const albumGroups = Object.entries(byAlbum);

    const aspectRatio = (item: GalleryItem) => {
        if (item.width && item.height && item.height > 0) return item.width / item.height;
        return 16 / 9;
    };

    const renderCell = (item: GalleryItem, index: number, flatIndex: number) => (
        <GalleryCell
            key={item.id}
            thumb={item.thumbnail_src || item.src}
            alt={item.caption || item.alt || ''}
            ratio={aspectRatio(item)}
            onClick={() => openLightbox(flatIndex)}
        />
    );

    return (
        <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-poiret-one text-center mb-6">Gallery</h1>

            <div className="flex flex-wrap justify-center gap-2 mb-6" role="tablist" aria-label="Gallery view">
                {(['grid', 'timeline', 'albums'] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={viewMode === mode}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition ${viewMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        onClick={() => setViewMode(mode)}
                    >
                        {mode === 'grid' ? 'Grid' : mode === 'timeline' ? 'Timeline' : 'Albums'}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    <span className="sr-only">Loading gallery</span>
                </div>
            )}

            {error && (
                <p className="text-center text-red-400 py-8">{error}</p>
            )}

            {!loading && !error && items.length === 0 && (
                <p className="text-center text-gray-400 py-8">No media yet.</p>
            )}

            {!loading && !error && items.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {flatItems.map((item, index) => (
                        <div key={item.id} className="min-w-0">
                            {renderCell(item, index, index)}
                        </div>
                    ))}
                </div>
            )}

            {!loading && !error && items.length > 0 && viewMode === 'timeline' && (
                <div className="space-y-8">
                    {dateGroups.map(([date, groupItems]) => (
                        <section key={date}>
                            {date !== 'No date' && <h2 className="text-xl font-poiret-one mb-3">{date}</h2>}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {groupItems.map((item, i) => {
                                    const flatIndex = flatItems.findIndex((x) => x.id === item.id);
                                    return (
                                        <div key={item.id} className="min-w-0">
                                            {renderCell(item, i, flatIndex >= 0 ? flatIndex : 0)}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {!loading && !error && items.length > 0 && viewMode === 'albums' && (
                <div className="space-y-8">
                    {albumGroups.map(([albumName, groupItems]) => (
                        <section key={albumName}>
                            <h2 className="text-xl font-poiret-one mb-3">{albumName}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {groupItems.map((item, i) => {
                                    const flatIndex = flatItems.findIndex((x) => x.id === item.id);
                                    return (
                                        <div key={item.id} className="min-w-0">
                                            {renderCell(item, i, flatIndex >= 0 ? flatIndex : 0)}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {lightboxIndex !== null && flatItems[lightboxIndex] && (
                <Lightbox
                    items={flatItems}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onPrev={goPrev}
                    onNext={goNext}
                />
            )}
        </main>
    );
}

function LightboxSlide({ item }: { item: GalleryItem }) {
    return (
        <div className="flex-shrink-0 w-screen h-full flex items-center justify-center p-4">
            {item.type === 'video' ? (
                <video
                    src={item.src}
                    controls
                    className="max-w-full max-h-full object-contain"
                    poster={item.thumbnail_src || undefined}
                    playsInline
                />
            ) : (
                <img
                    src={item.src}
                    alt={item.caption || item.alt || ''}
                    className="max-w-full max-h-full object-contain select-none"
                    draggable={false}
                />
            )}
        </div>
    );
}

function Lightbox({
    items,
    currentIndex,
    onClose,
    onPrev,
    onNext,
}: {
    items: GalleryItem[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    const item = items[currentIndex];
    const prevItem = items[currentIndex > 0 ? currentIndex - 1 : items.length - 1];
    const nextItem = items[currentIndex < items.length - 1 ? currentIndex + 1 : 0];
    const canSwipe = items.length > 1;

    const trackRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const touchStartX = useRef(0);
    const dragging = useRef(false);
    const locked = useRef(false);
    const swipeDir = useRef<'prev' | 'next' | null>(null);

    useEffect(() => {
        closeRef.current?.focus();
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose, onPrev, onNext]);

    useEffect(() => {
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            trackRef.current.style.transform = 'translateX(-100vw)';
        }
    }, [currentIndex]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!canSwipe || locked.current) return;
        dragging.current = true;
        touchStartX.current = e.touches[0].clientX;
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
        }
    }, [canSwipe]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!dragging.current || !trackRef.current) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        trackRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!dragging.current || !trackRef.current) return;
        dragging.current = false;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const threshold = window.innerWidth * 0.2;
        const track = trackRef.current;

        track.style.transition = 'transform 0.25s ease-out';

        if (dx > threshold) {
            locked.current = true;
            swipeDir.current = 'prev';
            track.style.transform = 'translateX(0vw)';
        } else if (dx < -threshold) {
            locked.current = true;
            swipeDir.current = 'next';
            track.style.transform = 'translateX(-200vw)';
        } else {
            track.style.transform = 'translateX(-100vw)';
        }
    }, []);

    const handleTransitionEnd = useCallback(() => {
        if (!locked.current || !trackRef.current) return;
        const dir = swipeDir.current;
        swipeDir.current = null;
        locked.current = false;
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = 'translateX(-100vw)';
        if (dir === 'prev') onPrev();
        if (dir === 'next') onNext();
    }, [onPrev, onNext]);

    if (!item) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            tabIndex={0}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-20"
                aria-label="Close"
                ref={closeRef}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
            </button>

            {canSwipe && (
                <button
                    type="button"
                    onClick={onPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 z-20 hidden md:block"
                    aria-label="Previous"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                    </svg>
                </button>
            )}
            {canSwipe && (
                <button
                    type="button"
                    onClick={onNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 z-20 hidden md:block"
                    aria-label="Next"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                </button>
            )}

            <div
                className="w-screen h-full overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    ref={trackRef}
                    className="flex h-full"
                    style={{ width: '300vw', transform: 'translateX(-100vw)', willChange: 'transform' }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    <LightboxSlide item={prevItem} />
                    <LightboxSlide item={item} />
                    <LightboxSlide item={nextItem} />
                </div>
            </div>

            {(item.caption || item.date) && (
                <div className="absolute bottom-6 left-0 right-0 text-center text-white text-sm z-20 pointer-events-none">
                    {item.caption && <p>{item.caption}</p>}
                    {item.date && <p className="text-gray-400">{item.date}</p>}
                </div>
            )}
        </div>
    );
}
