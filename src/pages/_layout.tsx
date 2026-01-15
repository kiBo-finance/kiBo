import '../styles.css'

import type { ReactNode } from 'react'
import { AuthProvider } from '../components/providers/AuthProvider'
import { JotaiProvider } from '../components/providers/JotaiProvider'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { ServiceWorkerProvider } from '../components/providers/ServiceWorkerProvider'
import { OfflineIndicator } from '../components/ui/offline-indicator'

type RootLayoutProps = { children: ReactNode }

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>kiBo - 多通貨対応家計簿アプリ</title>
        <meta
          name="description"
          content="複数の銀行口座、クレジットカード、多通貨に対応した家計簿アプリ。資産管理をシンプルに。"
        />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4C1A9D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="kiBo" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* OGP / SNS Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="kiBo - 多通貨対応家計簿アプリ" />
        <meta
          property="og:description"
          content="複数の銀行口座、クレジットカード、多通貨に対応した家計簿アプリ。資産管理をシンプルに。"
        />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <ThemeProvider defaultTheme="system" storageKey="kibo-ui-theme">
          <JotaiProvider>
            <ServiceWorkerProvider>
              <OfflineIndicator />
              <AuthProvider>{children}</AuthProvider>
            </ServiceWorkerProvider>
          </JotaiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
