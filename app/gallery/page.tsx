import { Metadata } from 'next';
import GalleryClient from './GalleryClient';

export const metadata: Metadata = {
    title: 'Gallery | MoshAvi Productions',
    description: 'Photos and videos from MoshAvi',
    openGraph: {
        title: 'Gallery | MoshAvi Productions',
        description: 'Photos and videos from MoshAvi',
        url: 'https://www.moshavi.com/gallery',
        type: 'website',
        siteName: 'MoshAvi',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gallery | MoshAvi Productions',
        description: 'Photos and videos from MoshAvi',
    },
};

export default function GalleryPage() {
    return <GalleryClient />;
}
