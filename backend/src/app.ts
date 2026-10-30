import Fastify, { type FastifyError } from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import { STATUS_CODES } from 'node:http'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import prismaPlugin from './plugins/prisma.js'
import { resolveJwtSecret } from './lib/auth.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import referenceRoutes from './routes/reference.js'
import roomRoutes from './routes/rooms.js'
import bookingRoutes from './routes/bookings.js'
import notificationRoutes from './routes/notifications.js'
import { ValidationProblem, HttpError, ProblemDetails, Health } from './types.js'

/**
 * Переводит известные ошибки Prisma в HTTP-статусы, чтобы клиент получал 404/409, а не 500.
 * Проверяем только поле code, поэтому не зависим от класса ошибки сгенерированного клиента.
 */
function describePrismaError(err: unknown): { status: number; detail: string } | null {
  if (typeof err !== 'object' || err === null) return null
  const code = (err as { code?: unknown }).code
  if (typeof code !== 'string') return null

  switch (code) {
    case 'P2002':
      return { status: 409, detail: 'Запись с такими уникальными данными уже существует' }
    case 'P2003':
      return { status: 409, detail: 'Операция нарушает связи между данными' }
    case 'P2025':
      return { status: 404, detail: 'Запись не найдена' }
    default:
      return null
  }
}

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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
        title: 'Room & Assets API',
        version: '1.0.0',
        description: 'HTTP-API учёта аудиторий и бронирования оборудования, совместимый с RFC 9457 (Problem Details).',
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [
        { name: 'Auth', description: 'Регистрация, вход и текущий пользователь' },
        { name: 'Users', description: 'Управление пользователями и ролями (ADMIN)' },
        { name: 'Rooms', description: 'Каталог аудиторий' },
        { name: 'Bookings', description: 'Бронирование аудиторий' },
        { name: 'Notifications', description: 'Уведомления пользователя' },
        { name: 'Reference', description: 'Справочники: оборудование и статусы' },
        { name: 'System', description: 'Служебные эндпоинты' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  // Авторизация по JWT: токен проверяется в обработчиках через requireUser/requireAdmin (lib/auth.ts)
  const { secret, generated } = resolveJwtSecret()
  if (generated) {
    app.log.warn('JWT_SECRET не задан: использован случайный секрет, токены перестанут действовать после перезапуска')
  }
  await app.register(jwt, { secret })

  await app.register(prismaPlugin)

  // Глобальные обработчики ошибок

  app.setErrorHandler<FastifyError | ValidationProblem | HttpError>((err, req, reply) => {
    const prismaProblem = describePrismaError(err)
    const status = prismaProblem?.status ?? (typeof err.statusCode === 'number' ? err.statusCode : 500)
    const isValidation = err instanceof ValidationProblem

    if (status >= 500) req.log.error(err)

    // Внутренние сообщения о неожиданных сбоях клиенту не показываем
    const exposeMessage = status < 500 || err instanceof HttpError
    const detail = prismaProblem?.detail ?? (exposeMessage ? err.message : 'Internal Server Error')

    const problem = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail: detail || 'Unexpected error',
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

  // Служебные маршруты

  app.get(
    '/api/health',
    {
      schema: {
        operationId: 'health',
        tags: ['System'],
        summary: 'Health/Readiness',
        description: 'Проверяет, что процесс жив и база данных отвечает.',
        response: {
          200: Health,
          503: ProblemDetails,
        },
      },
    },
    async (_req, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`
        return { ok: true }
      } catch {
        return reply.code(503).type('application/problem+json').send({
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

  // Маршруты API (каждый модуль — отдельный плагин)

  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(referenceRoutes)
  await app.register(roomRoutes)
  await app.register(bookingRoutes)
  await app.register(notificationRoutes)

  return app
}
