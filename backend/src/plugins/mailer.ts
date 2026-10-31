import fp from 'fastify-plugin'
import nodemailer from 'nodemailer'
import type { FastifyInstance } from 'fastify'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface Mailer {
  /** false, если SMTP не настроен (переменная SMTP_HOST пуста): письма тогда не отправляются */
  readonly enabled: boolean
  /**
   * Отправляет письмо. Никогда не бросает исключений: ошибки SMTP пишутся в лог,
   * чтобы сбой почты не ломал основной запрос. Значение null игнорируется.
   */
  send(message: MailMessage | null): Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    mailer: Mailer
  }
}

const DEFAULT_FROM = 'Room & Assets <no-reply@room-assets.local>'

/**
 * Почтовый транспорт на nodemailer, доступен как app.mailer.
 * Настройка через переменные окружения: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM.
 * В docker-compose по умолчанию используется Mailpit (SMTP-заглушка с веб-интерфейсом на :8025).
 */
export default fp(async (app: FastifyInstance) => {
  const host = process.env.SMTP_HOST?.trim()

  if (!host) {
    app.log.warn('SMTP_HOST не задан: почтовые уведомления отключены')
    const disabled: Mailer = { enabled: false, send: async () => {} }
    app.decorate('mailer', disabled)
    return
  }

  const parsedPort = Number(process.env.SMTP_PORT)
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 1025
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASSWORD ?? ''
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  })

  const mailer: Mailer = {
    enabled: true,
    async send(message) {
      if (!message) return
      try {
        await transporter.sendMail({ from, ...message })
        app.log.info({ to: message.to, subject: message.subject }, 'Письмо отправлено')
      } catch (err) {
        app.log.error({ err, to: message.to }, 'Не удалось отправить письмо')
      }
    },
  }

  app.decorate('mailer', mailer)
  app.addHook('onClose', async () => {
    transporter.close()
  })
})
