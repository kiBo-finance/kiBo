import { type NextRequest, NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes are handled by better-auth
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Check for auth cookie to determine authentication status
  const authToken = request.cookies.get('better-auth.session_token')?.value
  const isAuthenticated = !!authToken

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users from login page to dashboard
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
