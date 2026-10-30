import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { requireAdmin } from '../lib/auth.js'
import { toUserDto } from '../lib/mappers.js'
import { ChangeRoleBody, ErrorResponses, IdParams, User } from '../types.js'

// Управление пользователями — только для администратора
const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/api/users',
    {
      schema: {
        operationId: 'listUsers',
        tags: ['Users'],
        summary: 'Возвращает список пользователей (ADMIN)',
        security: [{ bearerAuth: [] }],
        response: { 200: T.Array(User), ...ErrorResponses },
      },
    },
    async (request) => {
      await requireAdmin(request)
      const users = await app.prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
      return users.map(toUserDto)
    }
  )

  app.patch(
    '/api/users/:id/role',
    {
      schema: {
        operationId: 'changeUserRole',
        tags: ['Users'],
        summary: 'Назначить пользователю роль (ADMIN)',
        security: [{ bearerAuth: [] }],
        params: IdParams,
        body: ChangeRoleBody,
        response: { 200: User, ...ErrorResponses },
      },
    },
    async (request) => {
      await requireAdmin(request)
      const user = await app.prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role },
      })
      return toUserDto(user)
    }
  )
}

export default userRoutes
