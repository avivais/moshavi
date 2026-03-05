'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// 1x1 dark gray image so video cells without a poster show a solid background instead of broken img
const VIDEO_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%231f2937' width='1' height='1'/%3E%3C/svg%3E";

function GalleryCell({ thumb, alt, ratio, type, onClick }: { thumb: string; alt: string; ratio: number; type: 'photo' | 'video'; onClick: () => void }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <button
            type="button"
            className="group w-full rounded-lg overflow-hidden bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black text-left transition-transform duration-200 hover:scale-[1.02] focus:scale-[1.02] cursor-pointer"
            onClick={onClick}
            style={{ aspectRatio: ratio }}
            aria-label={type === 'video' ? 'Play video' : 'View image'}
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
                {type === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                        <span className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/50 flex items-center justify-center ring-2 ring-white/80">
                            <svg className="w-6 h-6 md:w-7 md:h-7 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    </span>
                )}
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 pointer-events-none" aria-hidden="true" />
            </span>
        </button>
    );
}

function useColumnCount(itemCount: number) {
    const [cols, setCols] = useState(2);
    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            let c = 2;
            if (w >= 1024) c = 4;
            else if (w >= 640) c = 3;
            const maxBalanced = Math.max(2, Math.floor(itemCount / 2));
            setCols(Math.min(c, maxBalanced));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [itemCount]);
    return cols;
}

function buildColumns<T extends { width: number; height: number }>(items: T[], colCount: number): T[][] {
    const columns: T[][] = Array.from({ length: colCount }, () => []);
    const heights = new Array(colCount).fill(0);
    for (const item of items) {
        const ratio = item.width && item.height && item.height > 0 ? item.width / item.height : 16 / 9;
        const shortest = heights.indexOf(Math.min(...heights));
        columns[shortest].push(item);
        heights[shortest] += 1 / ratio;
    }
    return columns;
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
    const searchParams = useSearchParams();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch('/api/gallery')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load gallery');
                return res.json();
            })
            .then((data) => {
                if (mounted) {
                    // Defensive: only show items with displayable media (avoids ghost cells from bad data)
                    const displayable = Array.isArray(data)
                        ? data.filter((item: GalleryItem) => (item.thumbnail_src || item.src)?.trim())
                        : [];
                    setItems(displayable);
                }
            })
            .catch((err) => {
                if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        window.history.pushState({ galleryView: index }, '', `/gallery?view=${index}`);
    }, []);
    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
        window.history.replaceState(null, '', '/gallery');
    }, []);
    const goPrev = useCallback(() => {
        setLightboxIndex((i) => {
            if (i == null) return null;
            const next = i <= 0 ? items.length - 1 : i - 1;
            window.history.pushState({ galleryView: next }, '', `/gallery?view=${next}`);
            return next;
        });
    }, [items.length]);
    const goNext = useCallback(() => {
        setLightboxIndex((i) => {
            if (i == null) return null;
            const next = i >= items.length - 1 ? 0 : i + 1;
            window.history.pushState({ galleryView: next }, '', `/gallery?view=${next}`);
            return next;
        });
    }, [items.length]);

    useEffect(() => {
        const view = searchParams.get('view');
        if (!loading && items.length > 0 && view !== null && view !== '') {
            const index = parseInt(view, 10);
            if (Number.isInteger(index) && index >= 0 && index < items.length) {
                setLightboxIndex(index);
                window.history.replaceState({ galleryView: index }, '', `/gallery?view=${index}`);
            }
        }
    }, [loading, items.length, searchParams]);

    useEffect(() => {
        const onPopState = (e: PopStateEvent) => {
            const state = e.state as { galleryView?: number } | null;
            if (state?.galleryView !== undefined && state.galleryView >= 0 && state.galleryView < items.length) {
                setLightboxIndex(state.galleryView);
            } else {
                setLightboxIndex(null);
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [items.length]);

    const colCount = useColumnCount(items.length);

    const aspectRatio = (item: GalleryItem) => {
        if (item.width && item.height && item.height > 0) return item.width / item.height;
        return 16 / 9;
    };

    const columns = useMemo(() => buildColumns(items, colCount), [items, colCount]);

    return (
        <main className="min-h-screen px-4 md:px-8 lg:px-12 mx-auto max-w-screen-xl">
            <h1 className="text-3xl font-poiret-one text-center mb-6">Gallery</h1>

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

            {!loading && !error && items.length > 0 && (
                <div className="flex gap-3">
                    {columns.map((col, ci) => (
                        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-3">
                            {col.map((item) => {
                                const flatIndex = items.indexOf(item);
                                return (
                                    <GalleryCell
                                        key={item.id}
                                        thumb={
                                            item.type === 'video' && !(item.thumbnail_src?.trim())
                                                ? VIDEO_PLACEHOLDER
                                                : item.thumbnail_src || item.src
                                        }
                                        alt={item.caption || item.alt || ''}
                                        ratio={aspectRatio(item)}
                                        type={item.type}
                                        onClick={() => openLightbox(flatIndex)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {lightboxIndex !== null && items[lightboxIndex] && (
                <Lightbox
                    items={items}
                    currentIndex={lightboxIndex}
                    onClose={closeLightbox}
                    onPrev={goPrev}
                    onNext={goNext}
                />
            )}
        </main>
    );
}

function LightboxSlide({ item, isActive }: { item: GalleryItem; isActive?: boolean }) {
    const [loaded, setLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        setLoaded(false);
    }, [item.id]);
    useEffect(() => {
        const v = videoRef.current;
        if (item.type !== 'video' || !v) return;
        if (isActive) {
            v.play().catch(() => {});
        } else {
            v.pause();
        }
    }, [isActive, item.id, item.type]);
    return (
        <div className="flex-shrink-0 w-screen h-full flex items-center justify-center p-4 relative">
            {!loaded && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 z-10" aria-hidden="true">
                    <span className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </span>
            )}
            {item.type === 'video' ? (
                <video
                    ref={videoRef}
                    src={item.src}
                    controls
                    className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    poster={item.thumbnail_src || undefined}
                    playsInline
                    onLoadedData={() => {
                        setLoaded(true);
                        if (isActive) videoRef.current?.play().catch(() => {});
                    }}
                    onError={() => setLoaded(true)}
                />
            ) : (
                <img
                    src={item.src}
                    alt={item.caption || item.alt || ''}
                    className={`max-w-full max-h-full object-contain select-none transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
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
    const bgRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const dragging = useRef(false);
    const locked = useRef(false);
    const swipeDir = useRef<'prev' | 'next' | null>(null);
    const axis = useRef<'x' | 'y' | null>(null);
    const verticalDy = useRef(0);

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

    useLayoutEffect(() => {
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            trackRef.current.style.transform = 'translateX(-100vw)';
        }
    }, [currentIndex]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (locked.current) return;
        dragging.current = true;
        axis.current = null;
        verticalDy.current = 0;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!dragging.current) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        const dy = e.touches[0].clientY - touchStartY.current;

        if (!axis.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            axis.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
        }

        if (axis.current === 'y') {
            verticalDy.current = dy;
            if (trackRef.current) {
                trackRef.current.style.transition = 'none';
                trackRef.current.style.transform = `translateX(-100vw) translateY(${dy}px)`;
            }
            if (bgRef.current) {
                bgRef.current.style.opacity = String(Math.max(0, 1 - Math.abs(dy) / 300));
            }
        } else if (axis.current === 'x' && canSwipe && trackRef.current) {
            trackRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`;
        }
    }, [canSwipe]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = verticalDy.current;

        if (axis.current === 'y') {
            axis.current = null;
            const dismissThreshold = window.innerHeight * 0.15;
            if (Math.abs(dy) > dismissThreshold) {
                onClose();
                return;
            }
            if (trackRef.current) {
                trackRef.current.style.transition = 'transform 0.2s ease-out';
                trackRef.current.style.transform = 'translateX(-100vw) translateY(0)';
            }
            if (bgRef.current) {
                bgRef.current.style.transition = 'opacity 0.2s ease-out';
                bgRef.current.style.opacity = '1';
            }
            return;
        }

        axis.current = null;
        if (!trackRef.current) return;
        const threshold = window.innerWidth * 0.2;
        const track = trackRef.current;
        track.style.transition = 'transform 0.25s ease-out';

        if (dx > threshold && canSwipe) {
            locked.current = true;
            swipeDir.current = 'prev';
            track.style.transform = 'translateX(0vw)';
        } else if (dx < -threshold && canSwipe) {
            locked.current = true;
            swipeDir.current = 'next';
            track.style.transform = 'translateX(-200vw)';
        } else {
            track.style.transform = 'translateX(-100vw)';
        }
    }, [canSwipe, onClose]);

    const handleTransitionEnd = useCallback(() => {
        if (!locked.current) return;
        const dir = swipeDir.current;
        swipeDir.current = null;
        locked.current = false;
        if (dir === 'prev') onPrev();
        if (dir === 'next') onNext();
    }, [onPrev, onNext]);

    if (!item) return null;

    return (
        <div
            className="fixed inset-0 z-[200]"
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            tabIndex={0}
        >
            <div ref={bgRef} className="absolute inset-0 bg-black" />

            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/50 rounded-full text-white p-2 z-20"
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
                className="relative w-screen h-full overflow-hidden"
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
                    <LightboxSlide item={prevItem} isActive={false} />
                    <LightboxSlide item={item} isActive />
                    <LightboxSlide item={nextItem} isActive={false} />
                </div>
            </div>

            {(item.caption || item.date) && (
                <div className="absolute bottom-6 left-0 right-0 text-center text-white text-sm z-20 pointer-events-none">
                    {item.caption && <p className="bg-black/40 inline-block px-3 py-1 rounded">{item.caption}</p>}
                    {item.date && <p className="text-gray-400">{item.date}</p>}
                </div>
            )}
        </div>
    );
}
