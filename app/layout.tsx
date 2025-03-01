import { Poiret_One } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const poiretOne = Poiret_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-poiret-one',
})

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body className={`bg-black text-white ${poiretOne.variable}`}>
                <Nav />
                <div className="pt-16">{children}</div>
            </body>
        </html>
    )
}