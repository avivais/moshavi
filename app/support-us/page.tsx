import { Metadata } from 'next'
import SupportUsClient from './SupportUsClient' // We'll create this next

export const metadata: Metadata = {
  title: 'MoshAvi Productions | Support Us',
  description: 'תרקדו כאילו אין מחר ותתרמו כאילו יש עלויות',
  openGraph: {
    title: 'MoshAvi Productions | Support Us',
    description: 'תרקדו כאילו אין מחר ותתרמו כאילו יש עלויות',
    url: 'https://www.moshavi.com/support-us',
    type: 'website',
    siteName: 'MoshAvi',
    images: [
      {
        url: 'https://www.moshavi.com/media/og/support-us.jpg',
        width: 1200,
        height: 630,
        alt: 'MoshAvi Productions | Support Us',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoshAvi Productions | Support Us',
    description: 'תרקדו כאילו אין מחר ותתרמו כאילו יש עלויות',
    images: ['https://www.moshavi.com/media/og/support-us.jpg'],
  },
}

export default function SupportUs() {
  return <SupportUsClient />
}