import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import type { PrismaClient } from '../generated/prisma/client.js'
import { requireAdmin, requireUser } from '../lib/auth.js'
import {
  FREE_BOOKING_STATUSES,
  bookingInclude,
  dateOf,
  formatTime,
  parseSlot,
  timeOf,
  toBookingDto,
} from '../lib/mappers.js'
import { notifyUser } from '../lib/notify.js'
import {
  Booking,
  BookingsQuery,
  CreateBookingBody,
  ErrorResponses,
  HttpError,
  IdParams,
  UpdateBookingBody,
  UpdateBookingStatusBody,
} from '../types.js'

/** Подходит и для app.prisma, и для клиента внутри $transaction. */
type BookingDb = Pick<PrismaClient, 'booking'>

/** Бросает 409, если в аудитории уже есть активная бронь, пересекающаяся с интервалом. */
async function ensureSlotFree(
  db: BookingDb,
  roomId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
): Promise<void> {
  const overlap = await db.booking.findFirst({
    where: {
      roomId,
      ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      status: { code: { notIn: FREE_BOOKING_STATUSES } },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  })
  if (overlap) throw new HttpError(409, 'Это время уже занято другим бронированием')
}

/*
 * Права:
 *  - USER:  видит, создаёт и отменяет только собственные брони;
 *  - ADMIN: видит брони любого пользователя, создаёт брони от имени пользователя,
 *           редактирует (аудитория, дата, время, цель), меняет статус, отменяет (удаляет) любые брони.
 */
const bookingRoutes: FastifyPluginAsyncTypebox = async (app) => {
  async function loadBooking(id: string) {
    const booking = await app.prisma.booking.findUnique({ where: { id }, include: bookingInclude })
    if (!booking) throw new HttpError(404, 'Бронирование не найдено')
    return booking
  }

  async function loadBookableRoom(code: string) {
    const room = await app.prisma.room.findUnique({ where: { code }, include: { status: true } })
    if (!room) throw new HttpError(404, 'Указанная аудитория не найдена')
    if (room.status.code === 'maintenance') throw new HttpError(409, 'Аудитория находится на обслуживании')
    return room
  }

  async function loadBookingStatus(code: string, httpStatus: number) {
    const status = await app.prisma.bookingStatus.findUnique({ where: { code } })
    if (!status) {
      throw new HttpError(
        httpStatus,
        httpStatus === 400
          ? `Неизвестный статус бронирования: ${code}`
          : 'Справочник статусов бронирований не заполнен'
      )
    }
    return status
  }

  // Список броней: свои; для администратора — ещё ?userId=... (брони пользователя) и ?all=true (все)
  app.get(
    '/api/bookings',
    {
      schema: {
        operationId: 'listBookings',
        tags: ['Bookings'],
        summary: 'Возвращает список бронирований',
        security: [{ bearerAuth: [] }],
        querystring: BookingsQuery,
        response: { 200: T.Array(Booking), ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const { all, userId } = request.query

      let ownerFilter: { userId?: string } = { userId: auth.sub }
      if (all === true || userId !== undefined) {
        if (auth.role !== 'ADMIN') throw new HttpError(403, 'Insufficient privileges')
        ownerFilter = all === true ? {} : { userId }
      }

      const bookings = await app.prisma.booking.findMany({
        where: ownerFilter,
        include: bookingInclude,
        orderBy: { startsAt: 'asc' },
      })
      return bookings.map(toBookingDto)
    }
  )

  // Одна бронь: владелец или администратор
  app.get(
    '/api/bookings/:id',
    {
      schema: {
        operationId: 'getBooking',
        tags: ['Bookings'],
        summary: 'Возвращает одно бронирование',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 200: Booking, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const booking = await loadBooking(request.params.id)
      if (auth.role !== 'ADMIN' && booking.userId !== auth.sub) throw new HttpError(403, 'Insufficient privileges')
      return toBookingDto(booking)
    }
  )

  // Создание брони: пользователь — для себя, администратор — для себя или любого пользователя (userId)
  app.post(
    '/api/bookings',
    {
      schema: {
        operationId: 'createBooking',
        tags: ['Bookings'],
        summary: 'Создать новое бронирование',
        security: [{ bearerAuth: [] }],
        body: CreateBookingBody,
        response: { 201: Booking, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request)
      const { roomCode, date, timeStart, timeEnd, purpose, userId } = request.body
      const { startsAt, endsAt } = parseSlot(date, timeStart, timeEnd)

      let ownerId = auth.sub
      if (userId !== undefined && userId !== auth.sub) {
        if (auth.role !== 'ADMIN') throw new HttpError(403, 'Insufficient privileges')
        const owner = await app.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
        if (!owner) throw new HttpError(404, 'Пользователь не найден')
        ownerId = owner.id
      }

      const room = await loadBookableRoom(roomCode)
      const confirmed = await loadBookingStatus('confirmed', 500)

      const created = await app.prisma.$transaction(async (tx) => {
        await ensureSlotFree(tx, room.id, startsAt, endsAt)

        const booking = await tx.booking.create({
          data: {
            roomId: room.id,
            userId: ownerId,
            statusId: confirmed.id,
            startsAt,
            endsAt,
            purpose: purpose ?? null,
          },
          include: bookingInclude,
        })

        const mail = await notifyUser(tx, {
          userId: ownerId,
          bookingId: booking.id,
          type: 'BOOKING_CREATED',
          title: 'Бронирование создано',
          message: `Аудитория ${room.code} (${room.name}) забронирована на ${date}, ${formatTime(startsAt)} – ${formatTime(endsAt)}.`,
        })

        return { booking, mail }
      })

      void app.mailer.send(created.mail)
      reply.code(201)
      return toBookingDto(created.booking)
    }
  )

  // Редактирование брони (ADMIN): аудитория, дата, время, цель. Передаются только изменяемые поля.
  app.put(
    '/api/bookings/:id',
    {
      schema: {
        operationId: 'updateBooking',
        tags: ['Bookings'],
        summary: 'Изменить бронирование: аудитория, дата, время, цель (ADMIN)',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        body: UpdateBookingBody,
        response: { 200: Booking, ...ErrorResponses },
      },
    },
    async (request) => {
      await requireAdmin(request)
      const body = request.body
      const existing = await loadBooking(request.params.id)

      const date = body.date ?? dateOf(existing.startsAt)
      const timeStart = body.timeStart ?? timeOf(existing.startsAt)
      const timeEnd = body.timeEnd ?? timeOf(existing.endsAt)
      const { startsAt, endsAt } = parseSlot(date, timeStart, timeEnd)

      let roomId = existing.roomId
      if (body.roomCode !== undefined && body.roomCode !== existing.room.code) {
        roomId = (await loadBookableRoom(body.roomCode)).id
      }

      const updated = await app.prisma.$transaction(async (tx) => {
        // Отменённая или отклонённая бронь аудиторию не занимает, поэтому конфликт проверяем только у активных
        if (!FREE_BOOKING_STATUSES.includes(existing.status.code)) {
          await ensureSlotFree(tx, roomId, startsAt, endsAt, existing.id)
        }

        const booking = await tx.booking.update({
          where: { id: existing.id },
          data: { roomId, startsAt, endsAt, purpose: body.purpose },
          include: bookingInclude,
        })

        const mail = await notifyUser(tx, {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'BOOKING_UPDATED',
          title: 'Бронирование изменено',
          message: `Администратор изменил бронирование: аудитория ${booking.room.code}, ${date}, ${timeStart} – ${timeEnd}.`,
        })

        return { booking, mail }
      })

      void app.mailer.send(updated.mail)
      return toBookingDto(updated.booking)
    }
  )

  // Смена статуса брони (ADMIN): подтверждение, отклонение и т.д.
  app.patch(
    '/api/bookings/:id/status',
    {
      schema: {
        operationId: 'updateBookingStatus',
        tags: ['Bookings'],
        summary: 'Изменить статус бронирования (ADMIN)',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        body: UpdateBookingStatusBody,
        response: { 200: Booking, ...ErrorResponses },
      },
    },
    async (request) => {
      await requireAdmin(request)
      const status = await loadBookingStatus(request.body.status, 400)

      const updated = await app.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.update({
          where: { id: request.params.id },
          data: { statusId: status.id },
          include: bookingInclude,
        })

        const mail = await notifyUser(tx, {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'BOOKING_STATUS_CHANGED',
          title: 'Статус бронирования изменён',
          message: `Бронирование аудитории ${booking.room.code} на ${dateOf(booking.startsAt)} теперь имеет статус «${status.name}».`,
        })

        return { booking, mail }
      })

      void app.mailer.send(updated.mail)
      return toBookingDto(updated.booking)
    }
  )

  // Отмена и удаление — одно действие: владелец или администратор.
  // Запись остаётся в истории со статусом «cancelled», аудитория освобождается, владелец получает уведомление.
  app.delete(
    '/api/bookings/:id',
    {
      schema: {
        operationId: 'cancelBooking',
        tags: ['Bookings'],
        summary: 'Отменить (удалить) бронирование: владелец или ADMIN',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 204: T.Null({ description: 'Бронирование отменено' }), ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request)
      const booking = await loadBooking(request.params.id)
      if (auth.role !== 'ADMIN' && booking.userId !== auth.sub) throw new HttpError(403, 'Insufficient privileges')

      if (booking.status.code !== 'cancelled') {
        const cancelled = await loadBookingStatus('cancelled', 500)
        const byAdmin = auth.sub !== booking.userId

        const mail = await app.prisma.$transaction(async (tx) => {
          await tx.booking.update({ where: { id: booking.id }, data: { statusId: cancelled.id } })
          return notifyUser(tx, {
            userId: booking.userId,
            bookingId: booking.id,
            type: 'BOOKING_CANCELLED',
            title: 'Бронирование отменено',
            message: `Бронирование аудитории ${booking.room.code} на ${dateOf(booking.startsAt)} отменено${byAdmin ? ' администратором' : ''}.`,
          })
        })
        void app.mailer.send(mail)
      }

      return reply.code(204).send(null)
    }
  )
}

export default bookingRoutes
