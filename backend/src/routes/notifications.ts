import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireUser } from '../lib/auth.js'
import { toNotificationDto } from '../lib/mappers.js'
import {
  ErrorResponses,
  HttpError,
  IdParams,
  Notification,
  NotificationsQuery,
  UnreadCount,
  UpdatedCount,
} from '../types.js'

// Уведомления всегда принадлежат текущему пользователю
const notificationRoutes: FastifyPluginAsyncTypebox = async (app) => {
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

  app.get(
    '/api/notifications/unread-count',
    {
      schema: {
        operationId: 'countUnreadNotifications',
        tags: ['Notifications'],
        summary: 'Количество непрочитанных уведомлений (для значка колокольчика)',
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

      const updated = await app.prisma.notification.update({
        where: { id: existing.id },
        data: { isRead: true },
      })
      return toNotificationDto(updated)
    }
  )
}

export default notificationRoutes
