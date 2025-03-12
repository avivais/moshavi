import { Metadata } from 'next'
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
  },
}

export default function Sets() {
  return <SetsClient />
}