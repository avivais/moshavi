import { Metadata } from 'next'
import { Suspense } from 'react'
import SetsClient from './SetsClient'

export const metadata: Metadata = {
    title: 'MoshAvi Productions | Sets',
    description: 'Listen to our past sets',
    openGraph: {
        title: 'MoshAvi Productions | Sets',
        description: 'Listen to our past sets',
        url: 'https://www.moshavi.com/sets',
        type: 'website',
        siteName: 'MoshAvi',
        images: [
            {
                url: 'https://www.moshavi.com/media/og/latest-set.jpg',
                width: 1200,
                height: 630,
                alt: 'MoshAvi Productions | Sets',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MoshAvi Productions | Sets',
        description: 'Listen to our past sets',
        images: ['https://www.moshavi.com/media/og/latest-set.jpg'],
    },
}

export default function Sets() {
    return (
        <Suspense fallback={<main className="min-h-screen p-2 md:p-4 max-w-content-wide mx-auto" />}>
            <SetsClient />
        </Suspense>
    )
}