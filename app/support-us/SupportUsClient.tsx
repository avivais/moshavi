'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function SupportUsClient() {
    // State to store the randomly selected image index
    const [randomImage, setRandomImage] = useState(0)

    // Array of image file names
    const images = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg']

    // Set a random image on mount and ensure buttons are visible
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * images.length)
        setRandomImage(randomIndex)
        // Ensure the last donation button is visible by scrolling if needed
        setTimeout(() => {
            const lastButton = document.querySelector('.flex.flex-col.md\\:flex-row > div:last-child')
            if (lastButton) {
                const rect = lastButton.getBoundingClientRect()
                if (rect.bottom > window.innerHeight) {
                    window.scrollBy({
                        top: rect.bottom - window.innerHeight + 20, // Add some padding
                        behavior: 'smooth',
                    })
                }
            }
        }, 500) // Small delay to ensure elements are rendered
    }, [images.length]) // Added images.length to dependency array

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

                <p className="font-karantina mb-6 text-7xl md:text-8xl">
                    <span className="font-bold">תרקדו</span> כאילו <span className="font-bold">אין</span> מחר
                    <br />
                    <span className="font-bold">תתרמו</span> כאילו <span className="font-bold">יש</span> עלויות
                </p>

                <div className="flex justify-center">
                    <div className="w-full max-w-md">
                        <div className="flex flex-col md:flex-row justify-center space-y-6 md:space-y-0 md:space-x-4 mb-6 text-xl">
                            {/* PayBox Button */}
                            <div className="flex flex-col items-center">
                                <a
                                    href="https://payboxapp.page.link/vT1bQQiMiiiXHZz49"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-6 py-5 rounded-lg font-semibold hover:bg-green-600 transition w-[80%] md:w-auto md:min-w-[200px] flex items-center justify-center space-x-2 mx-auto"
                                >
                                    <div className="w-8 h-8">
                                        <Image src="/media/logo/paybox.png" width={32} height={32} alt="PayBox Logo" />
                                    </div>
                                    <span>PayBox</span>
                                </a>
                                <span className="text-xs mt-1 text-gray-400" dir="rtl">
                                    בדיקת סאונד 🎤
                                </span>
                            </div>

                            {/* Bit 50 ₪ Button */}
                            <div className="flex flex-col items-center">
                                <a
                                    href="https://www.bitpay.co.il/app/share-info?i=172411035573_19kH1D8L"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-6 py-5 rounded-lg font-semibold hover:bg-green-600 transition w-[80%] md:w-auto md:min-w-[200px] flex items-center justify-center space-x-2 mx-auto"
                                >
                                    <div className="w-8 h-8">
                                        <Image src="/media/logo/bit.png" width={32} height={32} alt="Bit Logo" />
                                    </div>
                                    <span dir="rtl">50 ₪</span>
                                </a>
                                <span className="text-xs mt-1 text-gray-400" dir="rtl">
                                    רמקול קטן לחימום 🔈
                                </span>
                            </div>

                            {/* Bit 100 ₪ Button */}
                            <div className="flex flex-col items-center">
                                <a
                                    href="https://www.bitpay.co.il/app/share-info?i=172411035573_19kH1DD8"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-6 py-5 rounded-lg font-semibold hover:bg-green-600 transition w-[80%] md:w-auto md:min-w-[200px] flex items-center justify-center space-x-2 mx-auto"
                                >
                                    <div className="w-8 h-8">
                                        <Image src="/media/logo/bit.png" width={32} height={32} alt="Bit Logo" />
                                    </div>
                                    <span dir="rtl">100 ₪</span>
                                </a>
                                <span className="text-xs mt-1 text-gray-400" dir="rtl">
                                    סאב מפלצתי 🔊
                                </span>
                            </div>

                            {/* Bit 200 ₪ Button */}
                            <div className="flex flex-col items-center">
                                <a
                                    href="https://www.bitpay.co.il/app/share-info?i=172411035573_19kH1DGK"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-6 py-5 rounded-lg font-semibold hover:bg-green-600 transition w-[80%] md:w-auto md:min-w-[200px] flex items-center justify-center space-x-2 mx-auto"
                                >
                                    <div className="w-8 h-8">
                                        <Image src="/media/logo/bit.png" width={32} height={32} alt="Bit Logo" />
                                    </div>
                                    <span dir="rtl">200 ₪</span>
                                </a>
                                <span className="text-xs mt-1 text-gray-400" dir="rtl">
                                    סאונד סיסטם קרחנה 🔥
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}