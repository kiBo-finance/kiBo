import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Better-authの実際のレスポンス型に合わせる
export interface User {
  id: string
  email: string
  emailVerified: boolean
  name: string
  createdAt: Date
  updatedAt: Date
  image?: string | null
  baseCurrency?: string
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthSession {
  user: User
  session: Session
}

// 認証状態
export const userAtom = atom<User | null>(null)
export const sessionAtom = atom<Session | null>(null)
export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom)
  const session = get(sessionAtom)
  return user !== null && session !== null
})

// ローディング状態
export const authLoadingAtom = atom<boolean>(false)
export const signInLoadingAtom = atom<boolean>(false)
export const signUpLoadingAtom = atom<boolean>(false)

// エラー状態
export const authErrorAtom = atom<string | null>(null)

// UI状態
export const showSignUpAtom = atom<boolean>(false)
export const rememberMeAtom = atomWithStorage('rememberMe', false)

// セッション管理用の派生アトム
export const sessionExpiryAtom = atom((get) => {
  const session = get(sessionAtom)
  if (!session) return null

  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  const timeUntilExpiry = expiresAt.getTime() - now.getTime()

  return {
    expiresAt,
    timeUntilExpiry,
    isExpired: timeUntilExpiry <= 0,
    expiresInMinutes: Math.floor(timeUntilExpiry / (1000 * 60)),
  }
})

// ユーザー設定用アトム
export const userPreferencesAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null

  return {
    baseCurrency: user.baseCurrency,
    emailVerified: user.emailVerified,
  }
})
