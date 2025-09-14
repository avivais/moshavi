'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

interface CarouselImage {
    id: number;
    src: string;
    alt: string;
    width: number;
    height: number;
}

export default function HomeClient() {
    const [images, setImages] = useState<CarouselImage[]>([])
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
                console.log('Fetching images from /api/carousel');
                const res = await fetch('/api/carousel');
                if (!res.ok) {
                    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
                }
                const data: CarouselImage[] = await res.json();
                console.log('Fetched data:', data);
                setImages(data);
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
                <div className="text-3xl">MoshAvi #005</div>
                <div className="text-xl">17.10.2025</div>
                <div className="text-lg font-bonheur-royale">Music Is The Answer</div>
            </section>

            <section className="w-screen mb-6">
                <div className="relative md:max-w-2xl mx-auto">
                    {loading ? (
                        <div className="text-center">Loading...</div>
                    ) : images.length > 0 ? (
                        <Slider {...carouselSettings}>
                            {images.map((image) => (
                                <div key={image.src}>
                                    <Image
                                        src={image.src}
                                        alt={image.alt}
                                        width={image.width}
                                        height={image.height}
                                        className="w-full h-auto object-cover focus:outline-none"
                                    />
                                </div>
                            ))}
                        </Slider>
                    ) : (
                        <div className="text-center">
                            {error || 'No images available'}
                        </div>
                    )}
                </div>
            </section>

            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4 px-6">
                <a
                    href="/support-us"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition"
                >
                    Support Us
                </a>
            </div>
        </main>
    )
}