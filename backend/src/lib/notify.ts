import type { PrismaClient } from '../generated/prisma/client.js'
import type { MailMessage } from '../plugins/mailer.js'

/** Подходит и для app.prisma, и для клиента внутри $transaction. */
export type NotifyClient = Pick<PrismaClient, 'user' | 'notification'>

export type NotificationKind =
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_STATUS_CHANGED'
  | 'BOOKING_UPDATED'
  | 'SYSTEM'

export interface NotifyInput {
  userId: string
  type: NotificationKind
  title: string
  message: string
  bookingId?: string | null
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Собирает письмо по тексту уведомления. */
export function buildNotificationMail(to: string, title: string, message: string): MailMessage {
  return {
    to,
    subject: title,
    text: `${message}\n\n— Room & Assets`,
    html: `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><p style="color:#6b6375">— Room &amp; Assets</p>`,
  }
}

/**
 * Создаёт уведомление пользователю. Уведомления о бронированиях не создаются,
 * если пользователь отключил их в настройках; системные приходят всегда.
 *
 * Возвращает письмо, которое нужно отправить, если у пользователя включены email-уведомления
 * (иначе null). Письмо специально не отправляется здесь: вызывающий код отправляет его через
 * app.mailer.send(...) уже после коммита транзакции, чтобы не рассылать письма о том, что было откачено.
 */
export async function notifyUser(db: NotifyClient, input: NotifyInput): Promise<MailMessage | null> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, notifyBooking: true, notifyEmail: true },
  })
  if (!user) return null
  if (input.type !== 'SYSTEM' && !user.notifyBooking) return null

  await db.notification.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  })

  return user.notifyEmail ? buildNotificationMail(user.email, input.title, input.message) : null
}
