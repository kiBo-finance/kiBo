import '../styles.css'

import type { ReactNode } from 'react'
import { AuthProvider } from './providers/AuthProvider'
import { JotaiProvider } from './providers/JotaiProvider'
import { ThemeProvider } from './providers/ThemeProvider'

export const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>kiBoアプリ - 多通貨対応家計簿</title>
        <meta
          name="description"
          content="複数の銀行口座、クレジットカード、多通貨に対応した家計簿アプリ"
        />
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
            <AuthProvider>{children}</AuthProvider>
          </JotaiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
