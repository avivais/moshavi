'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import WhatsAppButton from './WhatsAppButton'

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
    const pathname = usePathname()
    const isActive = pathname === href
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`block p-4 w-full border-b border-gray-700 text-white hover:bg-gray-800 transition-colors focus-ring ${isActive ? 'underline underline-offset-2' : ''}`}
            aria-current={isActive ? 'page' : undefined}
        >
            {children}
        </Link>
    )
}

export default function Nav() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    return (
        <nav className="w-full bg-black p-2 fixed top-0 left-0 z-[100] font-poiret-one font-normal">
            <div className="flex justify-between items-center md:max-w-2xl mx-auto">
                <div className="flex items-center space-x-2">
                    <Link href="/" className="flex items-center space-x-2 focus-ring rounded">
                        <Image
                            src="/media/logo/logo.svg"
                            alt="MoshAvi Productions Logo"
                            width={32}
                            height={32}
                            className="h-8"
                        />
                        <span className="text-white font-poiret-one text-xl leading-none">
                            MoshAvi
                        </span>
                    </Link>
                    <WhatsAppButton />
                </div>
                <div className="md:hidden">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-white focus-ring rounded p-1"
                        aria-label="Toggle menu"
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
                <div
                    className={`md:hidden fixed top-12 left-0 w-full bg-black transition-all duration-300 ease-in-out z-50 ${
                        isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                >
                    <div className="w-full">
                        <NavLink href="/support-us" onClick={() => setIsOpen(false)}>Support Us</NavLink>
                        <NavLink href="/sets" onClick={() => setIsOpen(false)}>Sets</NavLink>
                        <Link
                            href="/music"
                            onClick={() => setIsOpen(false)}
                            className={`block p-4 w-full text-white hover:bg-gray-800 transition-colors focus-ring ${pathname === '/music' ? 'underline underline-offset-2' : ''}`}
                            aria-current={pathname === '/music' ? 'page' : undefined}
                        >
                            Music
                        </Link>
                    </div>
                </div>
                <ul className="hidden md:flex space-x-4">
                    <li>
                        <Link href="/support-us" className={`focus-ring rounded px-1 ${pathname === '/support-us' ? 'underline underline-offset-2' : ''}`} aria-current={pathname === '/support-us' ? 'page' : undefined}>Support Us</Link>
                    </li>
                    <li>
                        <Link href="/sets" className={`focus-ring rounded px-1 ${pathname === '/sets' ? 'underline underline-offset-2' : ''}`} aria-current={pathname === '/sets' ? 'page' : undefined}>Sets</Link>
                    </li>
                    <li>
                        <Link href="/music" className={`focus-ring rounded px-1 ${pathname === '/music' ? 'underline underline-offset-2' : ''}`} aria-current={pathname === '/music' ? 'page' : undefined}>Music</Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}