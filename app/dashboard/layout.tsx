import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold">kiBoアプリ</h1>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                  ダッシュボード
                </a>
                <a href="/dashboard/accounts" className="text-sm font-medium hover:text-primary transition-colors">
                  口座管理
                </a>
                <a href="/dashboard/cards" className="text-sm font-medium hover:text-primary transition-colors">
                  カード管理
                </a>
                <a href="/dashboard/settings" className="text-sm font-medium hover:text-primary transition-colors">
                  設定
                </a>
                <a href="/demo" className="text-sm font-medium hover:text-primary transition-colors">
                  デモ
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">
                {(session.user as any)?.email}
              </span>
              <form action="/api/auth/sign-out" method="POST">
                <button
                  type="submit"
                  className="text-sm font-medium hover:text-primary"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}