import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { emailLogger } from './logger'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

// SMTP設定の型定義
interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

// 環境変数からSMTP設定を取得
function getSMTPConfig(): SMTPConfig | null {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    return null
  }

  const portNum = parseInt(port, 10)

  return {
    host,
    port: portNum,
    secure: portNum === 465, // 465は通常SSL/TLS
    auth: {
      user,
      pass,
    },
  }
}

// トランスポーターのシングルトン
let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (transporter) {
    return transporter
  }

  const config = getSMTPConfig()
  if (!config) {
    emailLogger.warn('SMTP configuration not found. Email sending is disabled.')
    return null
  }

  transporter = nodemailer.createTransport(config)
  return transporter
}

// 送信元アドレス
function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kibo.bktsk.com'
}

/**
 * メールを送信する
 * 本番環境ではSMTP経由で送信、開発環境またはSMTP未設定の場合はログ出力のみ
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options

  // 開発環境またはSMTP未設定の場合はログ出力のみ
  if (process.env.NODE_ENV !== 'production') {
    emailLogger.debug('=== Development Mode: Email would be sent ===')
    emailLogger.debug('To:', to)
    emailLogger.debug('Subject:', subject)
    emailLogger.debug('Content:', text || html?.substring(0, 200) + '...')
    return
  }

  const transport = getTransporter()

  if (!transport) {
    emailLogger.warn('SMTP not configured. Skipping email send.')
    emailLogger.debug('Would have sent email to:', to, 'Subject:', subject)
    return
  }

  try {
    const info = await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html,
    })

    emailLogger.info('Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject,
    })
  } catch (error) {
    emailLogger.error('Failed to send email:', error)
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * SMTP接続をテストする
 */
export async function verifyEmailConnection(): Promise<boolean> {
  const transport = getTransporter()

  if (!transport) {
    emailLogger.warn('SMTP not configured. Cannot verify connection.')
    return false
  }

  try {
    await transport.verify()
    emailLogger.info('SMTP connection verified successfully')
    return true
  } catch (error) {
    emailLogger.error('SMTP connection verification failed:', error)
    return false
  }
}
