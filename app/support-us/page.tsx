'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function SupportUs() {
    // State to store the randomly selected image index
    const [randomImage, setRandomImage] = useState(0)

    // Array of image file names
    const images = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg']

    // Set a random image on mount
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * images.length)
        setRandomImage(randomIndex)
    }, [])

    return (
        <main className="min-h-screen flex flex-col items-center p-0 bg-black text-white">
            <section className="mb-6 text-center w-screen md:max-w-2xl">
                <div className="w-full mb-6">
                    <Image
                        src={`/media/support-us/${images[randomImage]}`}
                        alt={`Support Image ${randomImage + 1}`}
                        width={1200}
                        height={800}
                        className="w-full h-auto object-cover focus:outline-none"
                    />
                </div>

                <p className="font-karantina mb-6 text-6xl md:text-8xl">
                    <span className="font-bold">תרקדו</span> כאילו <span className="font-bold">אין</span> מחר
                    <br />
                    <span className="font-bold">תתרמו</span> כאילו <span className="font-bold">יש</span> עלויות
                </p>

                <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4 px-24">
                    <a
                        href="https://your-payment-link.com" // Replace with actual payment link
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition"
                    >
                        PayBox
                    </a>
                </div>
            </section>
        </main>
    )
}