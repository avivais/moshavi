'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function Nav() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="w-full bg-black p-2 fixed top-0 left-0 z-10">
            <div className="flex justify-between items-center md:max-w-2xl mx-auto">
                <Link href="/" className="flex items-center space-x-2">
                    <Image
                        src="/media/logo/logo.svg"
                        alt="MoshAvi Productions Logo"
                        width={32}
                        height={32}
                        className="h-8"
                    />
                    <span className="text-white font-poiret-one font-bold text-xl leading-none">
                        MoshAvi
                    </span>
                </Link>
                <div className="md:hidden">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-white focus:outline-none"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16m-7 6h7"
                            />
                        </svg>
                    </button>
                </div>
                <ul
                    className={`md:hidden fixed top-12 left-0 w-full bg-black transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                >
                    <li className="p-4 border-b border-gray-700">
                        <Link href="/support-us" onClick={() => setIsOpen(false)}>
                            Support Us
                        </Link>
                    </li>
                    <li className="p-4 border-b border-gray-700">
                        <Link href="/sets" onClick={() => setIsOpen(false)}>
                            Sets
                        </Link>
                    </li>
                    <li className="p-4">
                        <Link href="/music" onClick={() => setIsOpen(false)}>
                            Music
                        </Link>
                    </li>
                </ul>
                <ul className="hidden md:flex space-x-4">
                    <li><Link href="/support-us">Support Us</Link></li>
                    <li><Link href="/sets">Sets</Link></li>
                    <li><Link href="/music">Music</Link></li>
                </ul>
            </div>
        </nav>
    )
}