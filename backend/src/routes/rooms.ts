import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireAdmin } from '../lib/auth.js'
import { FREE_BOOKING_STATUSES, formatTime, roomInclude, toRoomDto } from '../lib/mappers.js'
import {
  CreateRoomBody,
  ErrorResponses,
  HttpError,
  IdParams,
  Room,
  ScheduleQuery,
  ScheduleSlot,
  UpdateRoomBody,
} from '../types.js'

const roomRoutes: FastifyPluginAsyncTypebox = async (app) => {
  /** Переводит коды оборудования в идентификаторы; неизвестный код — 400. */
  async function resolveEquipmentIds(codes: string[]): Promise<number[]> {
    const unique = [...new Set(codes)]
    const found = await app.prisma.equipment.findMany({ where: { code: { in: unique } } })
    const missing = unique.filter((code) => !found.some((item: any) => item.code === code));
    if (missing.length > 0) throw new HttpError(400, `Неизвестное оборудование: ${missing.join(', ')}`);
    return found.map((item: any) => item.id);
  }

  async function resolveRoomStatusId(code: string): Promise<number> {
    const status = await app.prisma.roomStatus.findUnique({ where: { code } })
    if (!status) throw new HttpError(400, `Неизвестный статус аудитории: ${code}`)
    return status.id
  }

  // Каталог аудиторий (публичный). Параметр ?page=1 фронтенд передаёт, но пагинация пока не нужна.
  app.get(
    '/api/rooms',
    {
      schema: {
        operationId: 'listRooms',
        tags: ['Rooms'],
        summary: 'Возвращает каталог аудиторий',
        response: { 200: T.Array(Room), ...ErrorResponses },
      },
    },
    async () => {
      const rooms = await app.prisma.room.findMany({ include: roomInclude, orderBy: { code: 'asc' } })
      return rooms.map(toRoomDto)
    }
  )

  app.get(
    '/api/rooms/:id',
    {
      schema: {
        operationId: 'getRoom',
        tags: ['Rooms'],
        summary: 'Возвращает одну аудиторию',
        params: IdParams,
        response: { 200: Room, ...ErrorResponses },
      },
    },
    async (request) => {
      const room = await app.prisma.room.findUnique({ where: { id: request.params.id }, include: roomInclude })
      if (!room) throw new HttpError(404, 'Указанная аудитория не найдена')
      return toRoomDto(room)
    }
  )

  // Занятые промежутки аудитории на выбранную дату
  app.get(
    '/api/rooms/:id/schedule',
    {
      schema: {
        operationId: 'getRoomSchedule',
        tags: ['Rooms'],
        summary: 'Занятые промежутки времени аудитории на дату',
        params: IdParams,
        querystring: ScheduleQuery,
        response: { 200: T.Array(ScheduleSlot), ...ErrorResponses },
      },
    },
    async (request) => {
      const room = await app.prisma.room.findUnique({ where: { id: request.params.id }, select: { id: true } })
      if (!room) throw new HttpError(404, 'Указанная аудитория не найдена')

      const dayStart = new Date(`${request.query.date}T00:00:00.000Z`)
      if (Number.isNaN(dayStart.getTime())) throw new HttpError(400, 'Некорректная дата')
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const bookings = await app.prisma.booking.findMany({
        where: {
          roomId: room.id,
          startsAt: { gte: dayStart, lt: dayEnd },
          status: { code: { notIn: FREE_BOOKING_STATUSES } },
        },
        include: { status: { select: { code: true } } },
        orderBy: { startsAt: 'asc' },
      })

      return bookings.map((b: any) => ({
        bookingId: b.id,
        from: formatTime(b.startsAt),
        to: formatTime(b.endsAt),
        title: b.purpose ?? undefined,
        status: b.status.code,
      }))
    }
  )

  // Создание аудитории (ADMIN)
  app.post(
    '/api/rooms',
    {
      schema: {
        operationId: 'createRoom',
        tags: ['Rooms'],
        summary: 'Добавить аудиторию в каталог (ADMIN)',
        security: [{ bearerAuth: [] }],
        body: CreateRoomBody,
        response: { 201: Room, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      await requireAdmin(request)
      const body = request.body

      const statusId = await resolveRoomStatusId(body.status ?? 'available')
      const equipmentIds = await resolveEquipmentIds(body.equipment ?? [])

      const room = await app.prisma.room.create({
        data: {
          code: body.code,
          name: body.name,
          capacity: body.capacity,
          description: body.description ?? null,
          statusId,
          equipment: { create: equipmentIds.map((equipmentId) => ({ equipmentId })) },
        },
        include: roomInclude,
      })

      reply.code(201)
      return toRoomDto(room)
    }
  )

  // Редактирование аудитории (ADMIN)
  app.put(
    '/api/rooms/:id',
    {
      schema: {
        operationId: 'updateRoom',
        tags: ['Rooms'],
        summary: 'Редактировать параметры аудитории (ADMIN)',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        body: UpdateRoomBody,
        response: { 200: Room, ...ErrorResponses },
      },
    },
    async (request) => {
      await requireAdmin(request)
      const body = request.body

      const statusId = body.status !== undefined ? await resolveRoomStatusId(body.status) : undefined
      const equipmentIds = body.equipment !== undefined ? await resolveEquipmentIds(body.equipment) : undefined

      const room = await app.prisma.room.update({
        where: { id: request.params.id },
        data: {
          code: body.code,
          name: body.name,
          capacity: body.capacity,
          description: body.description,
          statusId,
          // Список оборудования заменяется целиком
          equipment:
            equipmentIds !== undefined
              ? { deleteMany: {}, create: equipmentIds.map((equipmentId) => ({ equipmentId })) }
              : undefined,
        },
        include: roomInclude,
      })

      return toRoomDto(room)
    }
  )

  // Удаление аудитории (ADMIN). Брони удаляются каскадно.
  app.delete(
    '/api/rooms/:id',
    {
      schema: {
        operationId: 'deleteRoom',
        tags: ['Rooms'],
        summary: 'Удалить аудиторию из каталога (ADMIN)',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 204: T.Null({ description: 'Успешно удалено' }), ...ErrorResponses },
      },
    },
    async (request, reply) => {
      await requireAdmin(request)
      await app.prisma.room.delete({ where: { id: request.params.id } })
      return reply.status(204).send(null);
    }
  )
}

export default roomRoutes
