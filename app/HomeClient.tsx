'use client'

import Image from 'next/image'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { carouselImages, CarouselImage } from './carouselImages' // Import the type too

export default function HomeClient() {
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

  return (
    <main className="min-h-screen flex flex-col items-center p-0">
      <section className="mb-4 text-center px-4 font-poiret-one">
        <div className="text-3xl">MoshAvi #005</div>
        <div className="text-xl">TBA</div>
        <div className="text-lg font-bonheur-royale">Music Is The Answer</div>
      </section>

      <section className="w-screen mb-6">
        <div className="relative md:max-w-2xl mx-auto">
          <Slider {...carouselSettings}>
            {carouselImages.map((image: CarouselImage, index: number) => (
              <div key={`slide${index + 1}`}>
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