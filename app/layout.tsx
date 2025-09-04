import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { JotaiProvider } from '@/components/providers/JotaiProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'kiBoアプリ - 多通貨対応家計簿',
  description: '複数の銀行口座、クレジットカード、多通貨に対応した家計簿アプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="kibo-ui-theme">
          <JotaiProvider>
            <AuthProvider>{children}</AuthProvider>
            <Toaster richColors position="top-right" />
          </JotaiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
