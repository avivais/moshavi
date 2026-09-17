import { Metadata } from 'next'
import HomeClient from './HomeClient'
import db from '../database'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'MoshAvi Productions | Home',
    description: 'Music is the Answer!',
    openGraph: {
        title: 'MoshAvi Productions | Home',
        description: 'Music is the Answer!',
        url: 'https://www.moshavi.com',
        type: 'website',
        siteName: 'MoshAvi',
        images: [
            {
                url: 'https://www.moshavi.com/media/og/home.jpg?v=guest-session-20261002-full',
                width: 1280,
                height: 853,
                alt: 'MoshAvi Productions | Home',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MoshAvi Productions | Home',
        description: 'Music is the Answer!',
        images: ['https://www.moshavi.com/media/og/home.jpg?v=guest-session-20261002-full'],
    },
}

export default function Home() {
    let header = 'MoshAvi #008'
    let subHeader = '6.8.26 @ 20:00'

    try {
        const row = db.prepare(
            'SELECT home_header AS header, home_subheader AS subHeader FROM site_settings WHERE id = 1'
        ).get() as { header: string; subHeader: string } | undefined

        if (row) {
            header = row.header
            subHeader = row.subHeader
        }
    } catch {
        // Preserve the existing copy until db:setup creates the settings table.
    }

    return <HomeClient header={header} subHeader={subHeader} />
}
