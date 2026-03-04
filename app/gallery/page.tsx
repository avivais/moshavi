import { Metadata } from 'next';
import GalleryClient from './GalleryClient';

export const metadata: Metadata = {
    title: 'MoshAvi Productions | Gallery',
    description: 'Photos and videos from MoshAvi events',
    openGraph: {
        title: 'MoshAvi Productions | Gallery',
        description: 'Photos and videos from MoshAvi events',
        url: 'https://www.moshavi.com/gallery',
        type: 'website',
        siteName: 'MoshAvi',
        images: [
            {
                url: 'https://www.moshavi.com/media/og/gallery.jpg',
                width: 1200,
                height: 630,
                alt: 'MoshAvi Productions | Gallery',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'MoshAvi Productions | Gallery',
        description: 'Photos and videos from MoshAvi events',
        images: ['https://www.moshavi.com/media/og/gallery.jpg'],
    },
};

export default function GalleryPage() {
    return <GalleryClient />;
}
