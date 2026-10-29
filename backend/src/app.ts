import Fastify, { type FastifyError } from 'fastify'
import prismaPlugin from './plugins/prisma.js'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import { STATUS_CODES } from 'node:http'
import { Type as T } from '@sinclair/typebox'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { ValidationProblem, ProblemDetails, User, Health, Room, Booking, CreateBookingBody, UpdateRoomBody, LoginBody } from './types.js'

/**
 * Временное in-memory хранилище. На следующей лабе оно уедет в Postgres + Prisma,
 * а пока этого достаточно, чтобы научиться писать маршруты и схемы.
 */

// Вставляем ваши реальные данные в массив комнат бэкенда
// const rooms: Room[] = [
//   { id: "201", code: "201", name: "Конференц-зал", capacity: 50, equipment: ["projector","microphone","wifi"], status: "available" },
//   { id: "101", code: "101", name: "Лекционная аудитория", capacity: 120, equipment: ["projector","wifi"], status: "available" },
//   { id: "102", code: "102", name: "Компьютерный класс", capacity: 30, equipment: ["computers","projector","board","wifi"], status: "booked" },
//   { id: "202", code: "202", name: "Семинарская", capacity: 25, equipment: ["board","wifi"], status: "maintenance" },
//   { id: "203", code: "203", name: "Лаборантская", capacity: 20, equipment: ["wifi","computers","board"], status: "available" },
//   { id: "301", code: "301", name: "Компьютерный класс", capacity: 20, equipment: ["wifi","computers","board","projector"], status: "booked" },
//   { id: "302", code: "302", name: "Лекционная аудитория", capacity: 100, equipment: ["wifi","board","projector"], status: "available" }
// ]

// Добавляем массив бронирований, привязанный к вашим комнатам
let bookings: Booking[] = [
  { 
    id: "b-1", 
    roomCode: "102", 
    roomName: "Компьютерный класс", // ДОБАВИЛИ ПОЛЕ
    date: "2026-10-25", 
    time: "08:00 - 12:00", 
    userId: "u-1" 
  }
]

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    schemaErrorFormatter(errors, dataVar) {
      const msg = errors?.map((e) => e.message).filter(Boolean).join('; ') || 'Validation failed'
      return new ValidationProblem(msg, errors, dataVar)
    },
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Инфраструктурные плагины

  await app.register(helmet)

  // Для dev открываем localhost фронтенда, чтобы CORS-запросы из браузера проходили.
  await app.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: false,
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    enableDraftSpec: true,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
    errorResponseBuilder(request, ctx) {
      const seconds = Math.ceil(ctx.ttl / 1000)
      return {
        type: 'about:blank',
        title: 'Too Many Requests',
        status: 429,
        detail: `Rate limit exceeded. Retry in ${seconds} seconds.`,
        instance: request.url,
      } satisfies ProblemDetails
    },
  })

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Rooms API',
        version: '1.0.0',
        description: 'HTTP-API, совместимый с RFC 9457 (Problem Details).',
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        { name: 'Users', description: 'Маршруты для управления пользователями' },
        { name: 'System', description: 'Служебные эндпоинты' },
      ],
    },
  })

  await app.register(prismaPlugin)

  // Глобальные обработчики ошибок

  app.setErrorHandler<FastifyError | ValidationProblem>((err, req, reply) => {
    const status = typeof err.statusCode === 'number' ? err.statusCode : 500
    const isValidation = err instanceof ValidationProblem

    const problem = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail: err.message || 'Unexpected error',
      instance: req.url,
      ...(isValidation ? { errorsText: err.message } : {}),
    }

    reply.code(status).type('application/problem+json').send(problem)
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).type('application/problem+json').send({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
    } satisfies ProblemDetails)
  })

  // Маршруты API

  app.get( '/api/users',
{
      schema: {
        operationId: 'listUsers',
        tags: ['Users'],
        summary: 'Возвращает список пользователей',
        response: {
          200: { description: 'Список пользователей', content: { 'application/json': { schema: T.Array(User) } }, },
          429: { description: 'Too Many Requests', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          500: { description: 'Internal Server Error', content: { 'application/problem+json': { schema: ProblemDetails } }, },
        },
      },
    },
    async () => app.prisma.user.findMany({ select: { id: true, email: true } })
  )

  app.get(
    '/api/health',
    {
      schema: {
        operationId: 'health',
        tags: ['System'],
        summary: 'Health/Readiness',
        description: 'Проверяет, что процесс жив и база данных отвечает.',
        response: {
          200: { description: 'Ready', content: { 'application/json': { schema: Health } } },
          503: { description: 'Temporarily unavailable', content: { 'application/problem+json': { schema: ProblemDetails } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`
        return { ok: true } as Health
      } catch {
        reply.code(503).type('application/problem+json').send({
          type: 'https://example.com/problems/dependency-unavailable',
          title: 'Service Unavailable',
          status: 503,
          detail: 'Database ping failed',
          instance: '/api/health',
        } satisfies ProblemDetails)
      }
    }
  )

  // hide скрывает сам маршрут из генерируемой спецификации.
  app.get(
    '/openapi.json',
    { schema: { hide: true } },
    async (_req, reply) => {
      reply.type('application/json').send(app.swagger())
    }
  )

  app.get(
    "/api/rooms",
    {
      schema: {
        operationId: 'listRooms',
        tags: ['Rooms'],
        summary: 'Возвращает каталог аудиторий',
        response: {
          200: { description: 'Список комнат', content: { 'application/jso': { schema: T.Array(Room) } }, },
          401: { decrription: 'Missing or invalid token', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          403: { description: 'Insufficient privileges', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          429: { description: 'Too Many Requests', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          500: { description: 'Internal Server Error', content: { 'application/problem+json': { schema: ProblemDetails } }, },
        },
      },
    },
    async () => {
      const result = await app.prisma.room.findMany()
      return result as unknown as Room[]

    }
  );

  app.get(
    "/api/bookings",
    {
      schema: {
        operationId: "listBookings",
        tags: ["Bookings"],
        summary: "Возвращает список бронирований",
        response: {
          200: { description: "Список броней", content: { "application/json": { schema: T.Array(Booking) } }, },
          401: { decrription: "Missing or invalid token", content: { "application/problem+json": { schema: ProblemDetails } }, },
          429: { description: 'Too Many Requests', content: {'application/problem+json': { schema: ProblemDetails } }, },
          500: { description: 'Internal Server Error', content: { 'application/problem+json': { schema: ProblemDetails } }, },
        },
      },
    },
    async () => bookings
  );

  app.post(
    "/api/bookings",
    {
      schema: {
        operationId: 'createBooking',
        tags: ['Bookings'],
        summary: 'Создать новое бронирование',
        body: CreateBookingBody,
        response: {
          201: { description: 'Бронирование создано успешно', content: { 'application/json': { schema: Booking } }, },
          400: { description: 'Bad Request (Ошибка валидации данных)', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          401: { description: 'Missing or invalid token', content: {'applocation/problem+json': { schema: ProblemDetails } }, },
          409: { description: 'Time slot overlaps existing booking', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          422: { description: 'Validation failed', content: { 'appliacetion/problem+json': { schema: ProblemDetails } }, },
          429: { description: 'Too Many Requests', content: { 'application/problem+json': { schema: ProblemDetails } }, },
          500: { description: 'Internal Server Error', content: { 'application/problem+json': { schema: ProblemDetails } }, },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      
      const newBooking = {
        id: "b_" + Date.now(),
        roomCode: body.roomCode,
        roomName: body.roomCode === "101"  ? "Конференц-зал" : "Лекционная аудитория",
        date: body.date,
        time: `${body.timeStart} - ${body.timeEnd}`,
        userId: "u-1"
      };
  
      bookings.push(newBooking);
      reply.status(201);
      return newBooking;
    }
  );

    //Редактирование аудитории
    app.put(
      '/api/rooms/:id',
      {
        schema: {
          operationId: 'updateRoom',
          tags: ['Rooms'],
          summary: 'Редактировать параметры аудитории',
          body: UpdateRoomBody,
          response: {
            200: { description: 'Успешно обновлено', content: { 'application/json': { schema: Room } } },
            404: { 
              description: 'Аудитория не найдена',
              content: { 'application/problem+json': { schema: ProblemDetails } } 
            },
            400: { content: { 'application/problem+json': { schema: ProblemDetails } } },
            500: { content: { 'application/problem+json': { schema: ProblemDetails } } },
          }
        }
      },
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const body = request.body as any
  
        try {
          // Обновляем запись в Postgres через Prisma
          const updatedRoom = await app.prisma.room.update({
            where: { id: id },
            data: {
              ...(body.name && { name: body.name }),
              ...(body.capacity && { capacity: body.capacity }),
              ...(body.status && { status: body.status })
            }
          })
          return updatedRoom as unknown as Room

        } catch (err) {
          return reply.code(404).send({ 
            type: 'about:blank', title: 'Not Found',
            status: 404, detail: 'Указанная аудитория не найдена' 
          })
        }
      }
    )
  

  //Удаление аудитории
  app.delete(
    '/api/rooms/:id',
    {
      schema: {
        operationId: 'deleteRoom',
        tags: ['Rooms'],
        summary: 'Удалить аудиторию из каталога',
        response: {
          204: { description: 'Успешно удалено' },
          500: { content: { 'application/problem+json': { schema: ProblemDetails } } },
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      try {
        await app.prisma.room.delete({
          where: { id: id }
        })
        return reply.code(204).send()
      } catch {
        return reply.code(204).send()
      }
    }
  )

  //Вход пользователя
  app.post(
    '/api/auth/login',
    {
      schema: {
        operationId: 'loginUser',
        tags: ['Auth'],
        summary: 'Авторизация по почте и паролю',
        body: LoginBody,
        response: {
          200: { 
            description: 'Успешный вход', 
            content: { 'application/json': { schema: User } } 
          },
          401: { content: { 'application/problem+json': { schema: ProblemDetails } } },
          500: { content: { 'application/problem+json': { schema: ProblemDetails } } },
        }
      }
    },
    async (request, reply) => {
      const { email } = request.body as any
      const user = await request.server.prisma.user.findUnique({
        where: { email: email }
      })
      if (!user) {
        return reply.code(401).send({
          type: 'about:blank', 
          title: 'Unauthorized',
          status: 401, 
          detail: 'Неверный логин или пароль.'
        })
      }
      return user
    }

  )

  // 4. Выход пользователя
  app.post(
    '/api/auth/logout',
    {
      schema: {
        operationId: 'logoutUser',
        tags: ['Auth'],
        summary: 'Завершить сессию пользователя',
        response: {
          204: { description: 'Сессия успешно завершена' },
          404: { description: 'Страница не найдена '},
          405: { description: 'Чё-то случилось'},
          500: { content: { 'application/problem+json': { schema: ProblemDetails } } },
        }
      }
    },
    async (_, reply) => {
      return reply.code(204).send()
    }
  )

  
  return app
}