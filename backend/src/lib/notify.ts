import type { PrismaClient } from '../generated/prisma/client.js'

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

/**
 * Создаёт уведомление пользователю. Уведомления о бронированиях не создаются,
 * если пользователь отключил их в настройках; системные приходят всегда.
 * Возвращает true, если уведомление было создано.
 */
export async function notifyUser(db: NotifyClient, input: NotifyInput): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { notifyBooking: true } })
  if (!user) return false
  if (input.type !== 'SYSTEM' && !user.notifyBooking) return false

  await db.notification.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
  })
  return true
}
