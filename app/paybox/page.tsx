export default function Paybox() {
    return (
      <main className="min-h-screen flex flex-col items-center p-4">
        <h1 className="text-3xl mb-4">Support the Party</h1>
        <p className="text-gray-300 mb-6 text-center">
          Your donations keep the beats pumping and the nights unforgettable. Thanks!
        </p>
        <a
          href="https://your-paybox-link.com" // Replace with real link
          className="bg-neon-green text-black px-6 py-3 rounded-lg"
        >
          Donate Now
        </a>
      </main>
    )
  }