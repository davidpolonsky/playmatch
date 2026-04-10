import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import RedditPixel from '@/components/RedditPixel'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PlayMatch - Build Your Dream Team',
  description: 'Scan your soccer cards, build your ultimate lineup, and simulate matches against legends.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
  },
  openGraph: {
    title: 'PlayMatch - Build Your Dream Team',
    description: 'Scan your soccer cards, build your ultimate lineup, and simulate matches against legends.',
    url: 'https://playmatch.games',
    siteName: 'PlayMatch',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RedditPixel />
        <AuthProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
