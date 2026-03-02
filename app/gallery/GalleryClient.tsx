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
                    hasPrev={flatItems.length > 1}
                    hasNext={flatItems.length > 1}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') closeLightbox();
                        if (e.key === 'ArrowLeft') goPrev();
                        if (e.key === 'ArrowRight') goNext();
                    }}
                />
            )}
        </main>
    );
}

function Lightbox({
    items,
    currentIndex,
    onClose,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    onKeyDown,
}: {
    items: GalleryItem[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    onKeyDown: (e: React.KeyboardEvent) => void;
}) {
    const item = items[currentIndex];
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const pendingNavigate = useRef<'next' | 'prev' | null>(null);
    const touchStartX = useRef<number | null>(null);
    const SWIPE_THRESHOLD = 50;
    const n = items.length;

    useEffect(() => {
        setMounted(true);
        closeRef.current?.focus();
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose, onPrev, onNext]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (n <= 1) return;
        touchStartX.current = e.touches[0].clientX;
        setIsAnimating(false);
    }, [n]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current == null || n <= 1) return;
        const x = e.touches[0].clientX;
        let delta = touchStartX.current - x;
        const max = viewportRef.current?.clientWidth ?? 300;
        const limit = max * 0.6;
        delta = Math.max(-limit, Math.min(limit, delta));
        setDragOffset(delta);
        e.preventDefault();
    }, [n]);

    const handleTouchEnd = useCallback(() => {
        if (touchStartX.current == null) return;
        touchStartX.current = null;
        const width = viewportRef.current?.clientWidth ?? 300;
        if (dragOffset > SWIPE_THRESHOLD && hasNext) {
            pendingNavigate.current = 'next';
            setIsAnimating(true);
            setDragOffset(width);
        } else if (dragOffset < -SWIPE_THRESHOLD && hasPrev) {
            pendingNavigate.current = 'prev';
            setIsAnimating(true);
            setDragOffset(-width);
        } else {
            pendingNavigate.current = null;
            setIsAnimating(true);
            setDragOffset(0);
        }
    }, [dragOffset, hasPrev, hasNext]);

    const handleTransitionEnd = useCallback(() => {
        const pending = pendingNavigate.current;
        pendingNavigate.current = null;
        setDragOffset(0);
        setIsAnimating(false);
        if (pending === 'next') onNext();
        if (pending === 'prev') onPrev();
    }, [onNext, onPrev]);

    if (!mounted) return null;
    if (!item) return null;

    const slidePercent = n > 0 ? 100 / n : 100;
    const baseTranslate = -currentIndex * slidePercent;
    const translateX = `calc(${baseTranslate}% + ${dragOffset}px)`;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            onKeyDown={onKeyDown}
            tabIndex={0}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-10"
                aria-label="Close"
                ref={closeRef}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
            </button>
            {hasPrev && (
                <button
                    type="button"
                    onClick={onPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
                    aria-label="Previous"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                    </svg>
                </button>
            )}
            {hasNext && (
                <button
                    type="button"
                    onClick={onNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-10"
                    aria-label="Next"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                </button>
            )}

            <div
                ref={viewportRef}
                className="relative w-full flex-1 flex items-center justify-center min-h-0 overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
            >
                <div
                    className="flex h-full w-full"
                    style={{
                        width: `${n * 100}%`,
                        transform: `translateX(${translateX})`,
                        transition: isAnimating ? 'transform 0.25s ease-out' : 'none',
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {items.map((slide) => (
                        <div
                            key={slide.id}
                            className="flex-shrink-0 flex flex-col items-center justify-center h-full px-2"
                            style={{ width: `${100 / n}%` }}
                        >
                            {slide.type === 'video' ? (
                                <video
                                    src={slide.src}
                                    controls
                                    className="max-w-full max-h-[80vh] w-full object-contain"
                                    poster={slide.thumbnail_src || undefined}
                                    preload="auto"
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={slide.src}
                                    alt={slide.caption || slide.alt || ''}
                                    className="max-w-full max-h-[80vh] w-full object-contain"
                                />
                            )}
                            {(slide.caption || slide.date) && (
                                <div className="mt-2 text-white text-center text-sm">
                                    {slide.caption && <p>{slide.caption}</p>}
                                    {slide.date && <p className="text-gray-400">{slide.date}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
