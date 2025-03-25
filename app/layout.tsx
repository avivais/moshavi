import { poiretOne, karantina, bonheurRoyale, hennyPenny } from './fonts'
import './globals.css'
import Nav from '@/components/Nav'
import { GoogleAnalytics } from '@next/third-parties/google'

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
                {process.env.NEXT_PUBLIC_GA_ID && (
                    <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
                )}
            </body>
        </html>
    )
}