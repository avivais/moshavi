import { Metadata } from 'next'
import HomeClient from './HomeClient' // We'll create this next

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
        url: 'https://www.moshavi.com/media/og/home.jpg',
        width: 1200,
        height: 630,
        alt: 'MoshAvi Productions | Home',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoshAvi Productions | Home',
    description: 'Music is the Answer!',
    images: ['https://www.moshavi.com/media/og/home.jpg'],
  },
}

export default function Home() {
  return <HomeClient />
}