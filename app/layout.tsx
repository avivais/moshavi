import type { Metadata } from "next";
import { Geist, Geist_Mono, Poiret_One } from "next/font/google";
import "./globals.css";
import Nav from '@/components/Nav';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poiretOne = Poiret_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-poiret-one',
})

export const metadata: Metadata = {
  title: "MoshAvi Productions",
  description: "MoshAvi Productions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poiretOne.variable} antialiased`}
      >
        <Nav />
        <div className="pt-20">{children}</div>
      </body>
    </html>
  );
}
