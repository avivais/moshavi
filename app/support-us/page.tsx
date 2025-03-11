'use client'

import Link from 'next/link'

export default function SupportUs() {
    return (
        <main className="min-h-screen flex flex-col items-center p-0 bg-black text-white">
            <section className="mt-16 mb-6 text-center px-4 max-w-md md:max-w-2xl mx-auto">
                <h1 className="text-3xl font-spicy-rice mb-4">Support MoshAvi Productions</h1>
                <p className="text-xl mb-6">
                    Help us keep the party going! Your support enables us to bring amazing music and events to the community.
                </p>
                <p className="text-lg mb-6">
                    Contribute via our secure payment page or explore other ways to get involved.
                </p>
                <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
                    <a
                        href="https://your-payment-link.com" // Replace with actual payment link
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-neon-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition"
                    >
                        Donate Now
                    </a>
                    <Link href="/" className="bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition">
                        Back to Home
                    </Link>
                </div>
            </section>
        </main>
    )
}