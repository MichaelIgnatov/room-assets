import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireAdmin, requireUser } from '../lib/auth.js'
import { FREE_BOOKING_STATUSES, bookingInclude, formatTime, parseSlot, toBookingDto } from '../lib/mappers.js'
import {
  Booking,
  BookingsQuery,
  CreateBookingBody,
  ErrorResponses,
  HttpError,
  IdParams,
  UpdateBookingStatusBody,
} from '../types.js'

const bookingRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Список броней: обычный пользователь видит свои, администратор — свои или все (?all=true)
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
      const wantsAll = request.query.all === true
      if (wantsAll && auth.role !== 'ADMIN') throw new HttpError(403, 'Insufficient privileges')

      const bookings = await app.prisma.booking.findMany({
        where: wantsAll ? {} : { userId: auth.sub },
        include: bookingInclude,
        orderBy: { startsAt: 'asc' },
      })
      return bookings.map(toBookingDto)
    }
  )

  // Создание брони
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
      const { roomCode, date, timeStart, timeEnd, purpose } = request.body
      const { startsAt, endsAt } = parseSlot(date, timeStart, timeEnd)

      const room = await app.prisma.room.findFirst({ where: { code: roomCode }, include: { status: true } })
      if (!room) throw new HttpError(404, 'Указанная аудитория не найдена')
      if (room.status.code === 'maintenance') throw new HttpError(409, 'Аудитория находится на обслуживании')

      const confirmed = await app.prisma.bookingStatus.findUnique({ where: { code: 'confirmed' } })
      if (!confirmed) throw new HttpError(500, 'Справочник статусов бронирований не заполнен')

      const created = await app.prisma.$transaction(async (tx: any) => {
        const overlap = await tx.booking.findFirst({
          where: {
            roomId: room.id,
            status: { code: { notIn: FREE_BOOKING_STATUSES } },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        })
        if (overlap) throw new HttpError(409, 'Это время уже занято другим бронированием')

        const booking = await tx.booking.create({
          data: {
            roomId: room.id,
            userId: auth.sub,
            statusId: confirmed.id,
            startsAt,
            endsAt,
            purpose: purpose ?? null,
          },
          include: bookingInclude,
        })

        await tx.notification.create({
          data: {
            userId: auth.sub,
            bookingId: booking.id,
            type: 'BOOKING_CREATED',
            title: 'Бронирование создано',
            message: `Аудитория ${room.code} (${room.name}) забронирована на ${date}, ${formatTime(startsAt)} – ${formatTime(endsAt)}.`,
          },
        })

        return booking
      })

      reply.code(201)
      return toBookingDto(created)
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

      const status = await app.prisma.bookingStatus.findUnique({ where: { code: request.body.status } })
      if (!status) throw new HttpError(400, `Неизвестный статус бронирования: ${request.body.status}`)

      const updated = await app.prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.update({
          where: { id: request.params.id },
          data: { statusId: status.id },
          include: bookingInclude,
        })

        await tx.notification.create({
          data: {
            userId: booking.userId,
            bookingId: booking.id,
            type: 'BOOKING_STATUS_CHANGED',
            title: 'Статус бронирования изменён',
            message: `Бронирование аудитории ${booking.room.code} на ${booking.startsAt.toISOString().slice(0, 10)} теперь имеет статус «${status.name}».`,
          },
        })

        return booking
      })

      return toBookingDto(updated)
    }
  )

  // Отмена брони: владелец или администратор. Запись сохраняется со статусом «cancelled».
  app.delete(
    '/api/bookings/:id',
    {
      schema: {
        operationId: 'cancelBooking',
        tags: ['Bookings'],
        summary: 'Отменить бронирование',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 204: T.Null({ description: 'Бронирование отменено' }), ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request)

      const booking = await app.prisma.booking.findUnique({ where: { id: request.params.id }, include: bookingInclude })
      if (!booking) throw new HttpError(404, 'Бронирование не найдено')
      if (auth.role !== 'ADMIN' && booking.userId !== auth.sub) throw new HttpError(403, 'Insufficient privileges')

      if (booking.status.code !== 'cancelled') {
        const cancelled = await app.prisma.bookingStatus.findUnique({ where: { code: 'cancelled' } })
        if (!cancelled) throw new HttpError(500, 'Справочник статусов бронирований не заполнен')

        await app.prisma.$transaction(async (tx: any) => {
          await tx.booking.update({ where: { id: booking.id }, data: { statusId: cancelled.id } })
          await tx.notification.create({
            data: {
              userId: booking.userId,
              bookingId: booking.id,
              type: 'BOOKING_CANCELLED',
              title: 'Бронирование отменено',
              message: `Бронирование аудитории ${booking.room.code} на ${booking.startsAt.toISOString().slice(0, 10)} отменено.`,
            },
          })
        })
      }

      return reply.code(204).send(null);
    }
  )
}

export default bookingRoutes
