import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireAdmin, requireUser } from '../lib/auth.js'
import { toNotificationDto } from '../lib/mappers.js'
import {
  ClearNotificationsQuery,
  CreatedCount,
  DeletedCount,
  ErrorResponses,
  HttpError,
  IdParams,
  Notification,
  NotificationSettings,
  NotificationsQuery,
  SendNotificationBody,
  UnreadCount,
  UpdateNotificationSettingsBody,
  UpdatedCount,
} from '../types.js'

// Уведомления всегда принадлежат текущему пользователю; рассылку может делать только администратор
const notificationRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Список уведомлений (?unread=true — только непрочитанные)
  app.get(
    '/api/notifications',
    {
      schema: {
        operationId: 'listNotifications',
        tags: ['Notifications'],
        summary: 'Уведомления текущего пользователя',
        security: [{ bearerAuth: [] }],
        querystring: NotificationsQuery,
        response: { 200: T.Array(Notification), ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const rows = await app.prisma.notification.findMany({
        where: { userId: auth.sub, ...(request.query.unread === true ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map(toNotificationDto)
    }
  )

  // Счётчик для значка колокольчика в шапке
  app.get(
    '/api/notifications/unread-count',
    {
      schema: {
        operationId: 'countUnreadNotifications',
        tags: ['Notifications'],
        summary: 'Количество непрочитанных уведомлений',
        security: [{ bearerAuth: [] }],
        response: { 200: UnreadCount, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const count = await app.prisma.notification.count({ where: { userId: auth.sub, isRead: false } })
      return { count }
    }
  )

  // Настройки уведомлений (переключатели на странице «Настройки аккаунта»)
  app.get(
    '/api/notifications/settings',
    {
      schema: {
        operationId: 'getNotificationSettings',
        tags: ['Notifications'],
        summary: 'Настройки уведомлений текущего пользователя',
        security: [{ bearerAuth: [] }],
        response: { 200: NotificationSettings, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const user = await app.prisma.user.findUnique({
        where: { id: auth.sub },
        select: { notifyBooking: true, notifyEmail: true },
      })
      if (!user) throw new HttpError(401, 'Missing or invalid token')
      return user
    }
  )

  app.patch(
    '/api/notifications/settings',
    {
      schema: {
        operationId: 'updateNotificationSettings',
        tags: ['Notifications'],
        summary: 'Изменить настройки уведомлений',
        security: [{ bearerAuth: [] }],
        body: UpdateNotificationSettingsBody,
        response: { 200: NotificationSettings, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      return app.prisma.user.update({
        where: { id: auth.sub },
        data: { notifyBooking: request.body.notifyBooking, notifyEmail: request.body.notifyEmail },
        select: { notifyBooking: true, notifyEmail: true },
      })
    }
  )

  // Отметить все прочитанными
  app.post(
    '/api/notifications/read-all',
    {
      schema: {
        operationId: 'readAllNotifications',
        tags: ['Notifications'],
        summary: 'Отметить все уведомления прочитанными',
        security: [{ bearerAuth: [] }],
        response: { 200: UpdatedCount, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const result = await app.prisma.notification.updateMany({
        where: { userId: auth.sub, isRead: false },
        data: { isRead: true },
      })
      return { updated: result.count }
    }
  )

  // Отметить одно прочитанным
  app.patch(
    '/api/notifications/:id/read',
    {
      schema: {
        operationId: 'readNotification',
        tags: ['Notifications'],
        summary: 'Отметить уведомление прочитанным',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 200: Notification, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)

      const existing = await app.prisma.notification.findFirst({
        where: { id: request.params.id, userId: auth.sub },
        select: { id: true },
      })
      if (!existing) throw new HttpError(404, 'Уведомление не найдено')

      const updated = await app.prisma.notification.update({ where: { id: existing.id }, data: { isRead: true } })
      return toNotificationDto(updated)
    }
  )

  // Удалить одно уведомление
  app.delete(
    '/api/notifications/:id',
    {
      schema: {
        operationId: 'deleteNotification',
        tags: ['Notifications'],
        summary: 'Удалить уведомление',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        response: { 204: T.Null({ description: 'Уведомление удалено' }), ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request)
      const result = await app.prisma.notification.deleteMany({ where: { id: request.params.id, userId: auth.sub } })
      if (result.count === 0) throw new HttpError(404, 'Уведомление не найдено')
      return reply.code(204).send(null)
    }
  )

  // Очистить список (?onlyRead=true — только прочитанные)
  app.delete(
    '/api/notifications',
    {
      schema: {
        operationId: 'clearNotifications',
        tags: ['Notifications'],
        summary: 'Очистить уведомления текущего пользователя',
        security: [{ bearerAuth: [] }],
        querystring: ClearNotificationsQuery,
        response: { 200: DeletedCount, ...ErrorResponses },
      },
    },
    async (request) => {
      const auth = await requireUser(request)
      const result = await app.prisma.notification.deleteMany({
        where: { userId: auth.sub, ...(request.query.onlyRead === true ? { isRead: true } : {}) },
      })
      return { deleted: result.count }
    }
  )

  // Рассылка (ADMIN): одному пользователю или всем, если userId не указан
  app.post(
    '/api/notifications',
    {
      schema: {
        operationId: 'sendNotification',
        tags: ['Notifications'],
        summary: 'Отправить системное уведомление (ADMIN)',
        security: [{ bearerAuth: [] }],
        body: SendNotificationBody,
        response: { 201: CreatedCount, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      await requireAdmin(request)
      const { userId, title, message } = request.body

      const recipients = await app.prisma.user.findMany({
        where: userId !== undefined ? { id: userId } : {},
        select: { id: true },
      })
      if (userId !== undefined && recipients.length === 0) throw new HttpError(404, 'Пользователь не найден')

      const result = await app.prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          type: 'SYSTEM' as const,
          title,
          message,
        })),
      })

      reply.code(201)
      return { created: result.count }
    }
  )
}

export default notificationRoutes
