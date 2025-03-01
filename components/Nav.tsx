import Link from 'next/link'
import Image from 'next/image'

export default function Nav() {
    return (
        <nav className="w-full bg-gray-800 p-4 fixed top-0 left-0 z-10">
            <ul className="flex flex-col md:flex-row md:items-center justify-between text-white">
                <li className="flex items-center space-x-2">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/media/logo/logo.svg"
                            alt="MoshAvi Productions Logo"
                            width={32}
                            height={32}
                            className="h-16"
                        />
                        <span className="text-white font-poiret-one font-bold block text-3xl leading-none">
                            MOSHAVI
                        </span>
                    </Link>
                </li>
                <div className="flex space-x-4 mt-4 md:mt-0">
                    <li><Link href="/paybox">Donate</Link></li>
                    <li><Link href="/sets">Sets</Link></li>
                    <li><Link href="/music">Music</Link></li>
                </div>
            </ul>
        </nav>
    )
}