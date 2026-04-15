import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

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
        {/* Reddit Pixel — PageVisit fires on every page */}
        <Script id="reddit-pixel" strategy="afterInteractive">
          {`
            !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.queue.push(arguments)};p.queue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/v2.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
            rdt('init', 'a2_is5oo2qv81sj', { optOut: false, useDecimalCurrencyValues: true });
            rdt('track', 'PageVisit');
          `}
        </Script>
        <AuthProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
