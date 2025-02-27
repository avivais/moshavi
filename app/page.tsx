export default function Home() {
    return (
      <main className="min-h-screen flex flex-col items-center p-4">
        {/* Logo */}
        <div className="my-4">
          <h1 className="text-4xl font-bold text-neon-green">MoshAvi Productions</h1>
          {/* Replace with your logo image later */}
        </div>

        {/* Latest Invitation */}
        <section className="mb-6 text-center">
          <h2 className="text-2xl">Next Party: March 15, 2025</h2>
          <p className="text-gray-300">Join us under the stars!</p>
        </section>

        {/* Carousel Placeholder */}
        <section className="w-full max-w-md mb-6">
          <div className="h-48 bg-gray-800 flex items-center justify-center">
            <p>Image Carousel Coming Soon</p>
          </div>
        </section>

        {/* Latest Set */}
        <section className="mb-6 w-full max-w-md">
          <h3 className="text-xl">Latest Set</h3>
          <audio controls className="w-full mt-2">
            <source src="https://example.com/sample.mp3" type="audio/mp3" />
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