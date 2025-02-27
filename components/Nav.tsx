import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="w-full bg-gray-800 p-4 fixed top-0 left-0">
      <ul className="flex justify-around text-white">
        <li><Link href="/">Home</Link></li>
        <li><Link href="/paybox">Donate</Link></li>
        <li><Link href="/sets">Sets</Link></li>
        <li><Link href="/music">Music</Link></li>
      </ul>
    </nav>
  )
}