'use client'

import Image from 'next/image'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

export default function Home() {
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
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                },
            },
        ],
    }

    return (
        <main className="min-h-screen flex flex-col items-center p-0">
            <section className="mb-4 text-center px-4 font-spicy-rice">
                <h2 className="text-2xl">Purim @ MoshAvi</h2>
                <p className="text-xl">13.3.2025</p>
            </section>

            <section className="w-screen mb-6">
                <div className="relative md:max-w-2xl mx-auto">
                    <Slider {...carouselSettings}>
                        <div key="slide1">
                            <Image
                                src="/media/carousel/party-pic-1.jpg"
                                alt="Party Pic 1"
                                width={1200}
                                height={800}
                                className="w-full h-auto object-cover focus:outline-none"
                            />
                        </div>
                        <div key="slide2">
                            <Image
                                src="/media/carousel/party-pic-2.jpg"
                                alt="Party Pic 2"
                                width={1200}
                                height={800}
                                className="w-full h-auto object-cover focus:outline-none"
                            />
                        </div>
                        <div key="slide3">
                            <Image
                                src="/media/carousel/party-pic-3.jpg"
                                alt="Party Pic 3"
                                width={1200}
                                height={800}
                                className="w-full h-auto object-cover focus:outline-none"
                            />
                        </div>
                    </Slider>
                </div>
            </section>

            <section className="mb-6 w-full max-w-md md:max-w-2xl mx-auto px-4">
                <h3 className="text-xl">Latest Set</h3>
                <audio controls className="w-full mt-2">
                    <source src="[Your Audio URL]" type="audio/mp3" />
                    Your browser doesn’t support audio.
                </audio>
            </section>

            <div className="px-4">
                <a
                    href="/paybox"
                    className="bg-neon-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition"
                >
                    Support the Party
                </a>
            </div>
        </main>
    )
}