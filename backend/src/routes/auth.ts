import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireUser } from './../lib/auth.js'
import type { AuthPayload } from './../lib/auth.js'
import { toUserDto } from '../lib/mappers.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { notifyUser } from '../lib/notify.js'
import { AuthResponse, ChangePasswordBody, ErrorResponses, HttpError, LoginBody, RegisterBody, User } from '../types.js'

const TOKEN_TTL = '12h'

const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const issueToken = (payload: AuthPayload): string => app.jwt.sign(payload, { expiresIn: TOKEN_TTL })

  // Регистрация: новый пользователь всегда получает роль USER
  app.post(
    '/api/auth/register',
    {
      schema: {
        operationId: 'registerUser',
        tags: ['Auth'],
        summary: 'Регистрация нового пользователя',
        body: RegisterBody,
        response: { 201: AuthResponse, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body

      const user = await app.prisma.user.create({
        data: { email: email.toLowerCase(), name: name ?? null, passwordHash: hashPassword(password) },
      })

      reply.code(201)
      return {
        token: issueToken({ sub: user.id, email: user.email, role: user.role }),
        user: toUserDto(user),
      }
    }
  )

  // Вход пользователя
  app.post(
    '/api/auth/login',
    {
      schema: {
        operationId: 'loginUser',
        tags: ['Auth'],
        summary: 'Авторизация по почте и паролю',
        body: LoginBody,
        response: { 200: AuthResponse, ...ErrorResponses },
      },
    },
    async (request) => {
      const { email, password } = request.body
      const user = await app.prisma.user.findUnique({ where: { email: email.toLowerCase() } })

      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw new HttpError(401, 'Неверный логин или пароль.')
      }

      return {
        token: issueToken({ sub: user.id, email: user.email, role: user.role }),
        user: toUserDto(user),
      }
    }
  )

  // Текущий пользователь по токену
  app.get(
    '/api/auth/me',
    {
      schema: {
        operationId: 'currentUser',
        tags: ['Auth'],
        summary: 'Данные текущего пользователя',
        security: [{ bearerAuth: [] }],
        response: { 200: User, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const user = await app.prisma.user.findUnique({ where: { id: auth.sub } })
      if (!user) throw new HttpError(401, 'Missing or invalid token')
      return toUserDto(user)
    }
  )

  // Смена пароля: из профиля можно изменить только пароль
  app.post(
    '/api/auth/change-password',
    {
      schema: {
        operationId: 'changePassword',
        tags: ['Auth'],
        summary: 'Сменить пароль текущего пользователя',
        security: [{ bearerAuth: [] }],
        body: ChangePasswordBody,
        response: { 204: T.Null({ description: 'Пароль изменён' }), ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request)
      const { currentPassword, newPassword } = request.body

      const user = await app.prisma.user.findUnique({ where: { id: auth.sub } })
      if (!user) throw new HttpError(401, 'Missing or invalid token')
      if (!verifyPassword(currentPassword, user.passwordHash)) throw new HttpError(400, 'Неверный текущий пароль')

      await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } })
      await notifyUser(app.prisma, {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Пароль изменён',
        message: 'Пароль вашей учётной записи был изменён. Если это были не вы, обратитесь к администратору.',
      })

      return reply.code(204).send(null)
    }
  )

  // Выход: токен без состояния, поэтому клиент просто удаляет его у себя
  app.post(
    '/api/auth/logout',
    {
      schema: {
        operationId: 'logoutUser',
        tags: ['Auth'],
        summary: 'Завершить сессию пользователя',
        response: { 204: T.Null({ description: 'Сессия успешно завершена' }), ...ErrorResponses },
      },
    },
    async (_request, reply) => reply.code(204).send(null)
  )
}

export default authRoutes
