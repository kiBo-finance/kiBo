import { prisma } from './db'
import { sendEmail } from './email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { passkey } from '@better-auth/passkey'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      baseCurrency: {
        type: 'string',
        defaultValue: 'JPY',
        input: true,
      },
      isAdmin: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: 'メールアドレスの認証',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>kiBoアプリ - メールアドレス認証</h2>
            <p>こんにちは、${user.name}さん</p>
            <p>アカウント作成ありがとうございます。以下のリンクをクリックしてメールアドレスを認証してください。</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" 
                 style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                メールアドレスを認証する
              </a>
            </div>
            <p>このリンクは1時間有効です。</p>
            <p>もしこのメールに心当たりがない場合は、このメールを無視してください。</p>
          </div>
        `,
        text: `kiBoアプリ - メールアドレス認証\n\nこんにちは、${user.name}さん\n\nアカウント作成ありがとうございます。以下のリンクをクリックしてメールアドレスを認証してください：\n${url}\n\nこのリンクは1時間有効です。\nもしこのメールに心当たりがない場合は、このメールを無視してください。`,
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  basePath: '/api/auth',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    'https://kibo.bktsk.com',
  ],
  // OAuth プロバイダー設定（環境変数が設定されている場合のみ有効）
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }),
    ...(process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }),
  },
  plugins: [
    // パスキー認証（WebAuthn/FIDO2）
    passkey({
      rpName: 'kiBoアプリ',
      rpID: process.env.NODE_ENV === 'production' ? 'kibo.bktsk.com' : 'localhost',
      origin:
        process.env.NODE_ENV === 'production'
          ? 'https://kibo.bktsk.com'
          : 'http://localhost:3000',
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = (typeof auth.$Infer.Session)['user']
