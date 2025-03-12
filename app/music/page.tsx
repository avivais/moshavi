import { Metadata } from 'next'
import MusicClient from './MusicClient'

export const metadata: Metadata = {
    title: 'MoshAvi Productions | Monthly Playlists',
    description: 'Stay updated with our monthly playlists',
    openGraph: {
        title: 'MoshAvi Productions | Monthly Playlists',
        description: 'Stay updated with our monthly playlists',
        url: 'https://www.moshavi.com/music',
        type: 'website',
        siteName: 'MoshAvi',
        images: [
            {
                url: 'https://www.moshavi.com/media/og/playlists.jpg',
                width: 1200,
                height: 630,
                alt: 'MoshAvi Productions | Monthly Playlists',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MoshAvi Productions | Monthly Playlists',
        description: 'Stay updated with our monthly playlists',
        images: ['https://www.moshavi.com/media/og/playlists.jpg'],
    },
}

export default function Music() {
    return <MusicClient />
}