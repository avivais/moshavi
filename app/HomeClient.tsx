'use client'

import Image from 'next/image'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

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
      <section className="mb-4 text-center px-4 font-henny-penny">
        <div className="text-3xl font-poiret-one mb-2">MoshAvi #004</div>
        <div className="text-2xl bg-gradient-to-r from-yellow-300 via-purple-500 to-cyan-600 text-transparent bg-clip-text">
          Purim Edition
        </div>
        <div className="text-2xl bg-gradient-to-r from-yellow-300 via-purple-500 to-cyan-600 text-transparent bg-clip-text mb-1">
          13.3.2025
        </div>
        <div className="text-lg font-bonheur-royale">Music Is The Answer</div>
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
            <div key="slide4">
              <Image
                src="/media/carousel/party-pic-4.jpg"
                alt="Party Pic 4"
                width={1200}
                height={800}
                className="w-full h-auto object-cover focus:outline-none"
              />
            </div>
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