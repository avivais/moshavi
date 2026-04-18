'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

interface CarouselItem {
    id: number;
    src: string;
    thumbnail_src: string | null;
    type: string;
    alt: string;
    width: number;
    height: number;
}

export default function HomeClient() {
    const [items, setItems] = useState<CarouselItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const carouselSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        pauseOnHover: false,
        arrows: false,
    }

    useEffect(() => {
        async function fetchImages() {
            try {
                const res = await fetch('/api/carousel');
                if (!res.ok) {
                    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
                }
                const data: CarouselItem[] = await res.json();
                setItems(data);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load images';
                console.error('Fetch error:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }
        fetchImages();
    }, [])

    return (
        <main className="min-h-screen flex flex-col items-center p-0">
            <section className="mb-4 text-center px-4 font-poiret-one">
                <div className="text-3xl">MoshAvi #008</div>
                <div className="text-xl">TBD</div>
                <div className="text-lg font-bonheur-royale">Music Is The Answer</div>
            </section>

            <section className="w-screen mb-6">
                <div className="relative md:max-w-2xl lg:max-w-content-wide mx-auto">
                    {loading ? (
                        <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                            <span className="sr-only">Loading carousel</span>
                        </div>
                    ) : items.length > 0 ? (
                        <Slider {...carouselSettings}>
                            {items.map((item) => {
                                const displaySrc = item.type === 'video' ? (item.thumbnail_src || item.src) : item.src;
                                return (
                                    <div key={item.id} className="focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-black rounded-lg overflow-hidden">
                                        <div className="relative w-full aspect-[4/3] bg-gray-900">
                                            <Image
                                                src={displaySrc}
                                                alt={item.alt}
                                                fill
                                                className="object-cover rounded-lg"
                                                sizes="(max-width: 768px) 100vw, 672px"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </Slider>
                    ) : (
                        <div className="text-center py-8 px-4">
                            <p className="text-red-400">Something went wrong loading the carousel.</p>
                            {error && <p className="text-gray-500 text-sm mt-2 sr-only">{error}</p>}
                        </div>
                    )}
                </div>
            </section>

            <div className="flex flex-col md:flex-row justify-center gap-4 px-6">
                <a
                    href="/support-us"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition text-center"
                >
                    Support Us
                </a>
            </div>
        </main>
    )
}