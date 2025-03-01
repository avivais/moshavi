import Image from "next/image";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center p-4">
            {/* Logo */}
            <div className="my-4">
                <Image
                    src="/media/logo/logo.svg"
                    alt="MoshAvi Productions Logo"
                    width={256}
                    height={256}
                    className="h-16"
                />
            </div>

            {/* Latest Invitation */}
            <section className="mb-6 text-center">
                <h2 className="text-2xl">Next Party: [Your Date]</h2>
                <p className="text-gray-300">[Your Invite Text]</p>
            </section>

            {/* Carousel Placeholder */}
            <section className="w-full max-w-md mb-6">
                <div className="h-48 bg-gray-800 flex items-center justify-center">
                    <p>Image Carousel (Add your pics!)</p>
                </div>
            </section>

            {/* Latest Set */}
            <section className="mb-6 w-full max-w-md">
                <h3 className="text-xl">Latest Set</h3>
                <audio controls className="w-full mt-2">
                    <source src="[Your Audio URL]" type="audio/mp3" />
                    Your browser doesn’t support audio.
                </audio>
            </section>

            {/* Donation Button */}
            <a
                href="/paybox"
                className="bg-neon-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-400 transition"
            >
                Support the Party
            </a>
        </main>
    )
}