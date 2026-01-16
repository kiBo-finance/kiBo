import { emailLogger } from './logger'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  emailLogger.debug('Email would be sent to:', options.to)
  emailLogger.debug('Subject:', options.subject)
  emailLogger.debug('Content:', options.text || options.html)

  // Development環境では実際にはメールを送らず、コンソールに出力のみ
  // 本番環境では実際のメール送信サービス（SendGrid、Resend等）を使用
}
