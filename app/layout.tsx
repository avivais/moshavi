import { poiretOne, karantina, bonheurRoyale, hennyPenny } from './fonts'
import './globals.css'
import Nav from '@/components/Nav'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body className={`bg-black text-white ${poiretOne.variable} ${karantina.variable} ${bonheurRoyale.variable} ${hennyPenny.variable}`}>
                <Nav />
                <div className="pt-12">{children}</div>
            </body>
        </html>
    )
}