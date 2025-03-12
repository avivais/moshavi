import { Metadata } from 'next'
import MusicClient from './MusicClient'

export const metadata: Metadata = {
    title: 'MoshAvi Productions | Monthly Playlists',
    description: 'Discover our monthly YouTube playlists',
    openGraph: {
        title: 'MoshAvi Productions | Monthly Playlists',
        description: 'Discover our monthly YouTube playlists',
        url: 'https://www.moshavi.com/music',
        type: 'website',
        siteName: 'MoshAvi',
    },
}

export default function Music() {
    return <MusicClient />
}