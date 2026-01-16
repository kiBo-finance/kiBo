import { createAuthClient } from 'better-auth/react'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:3000',
  plugins: [passkeyClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient

// パスキー関連のエクスポート
export const passkey = authClient.passkey
