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
        <main className="min-h-screen flex flex-col items-center p-4">
            <div className="my-4">
                <Image
                    src="/media/logo/logo.svg"
                    alt="MoshAvi Productions Logo"
                    width={32}
                    height={32}
                    className="h-8"
                />
            </div>

            <section className="mb-6 text-center">
                <h2 className="text-2xl">Next Party: [Your Date]</h2>
                <p className="text-gray-300">[Your Invite Text]</p>
            </section>

            <section className="w-full max-w-md mb-6">
                <div className="relative">
                    <Slider key={Math.random()} {...carouselSettings}>
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

            <section className="mb-6 w-full max-w-md">
                <h3 className="text-xl">Latest Set</h3>
                <audio controls className="w-full mt-2">
                    <source src="[Your Audio URL]" type="audio/mp3" />
                    Your browser doesn’t support audio.
                </audio>
            </section>

            <a
                href="/paybox"
                className="bg-neon-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition"
            >
                Support the Party
            </a>
        </main>
    )
}