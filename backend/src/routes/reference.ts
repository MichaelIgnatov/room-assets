import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type as T } from '@sinclair/typebox'
import { Equipment, ErrorResponses, StatusRef } from '../types.js'

// Публичные справочники — нужны фронтенду для фильтров и форм
const referenceRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/api/equipment',
    {
      schema: {
        operationId: 'listEquipment',
        tags: ['Reference'],
        summary: 'Справочник оборудования',
        response: { 200: T.Array(Equipment), ...ErrorResponses },
      },
    },
    async () => app.prisma.equipment.findMany({ orderBy: { id: 'asc' } })
  )

  app.get(
    '/api/room-statuses',
    {
      schema: {
        operationId: 'listRoomStatuses',
        tags: ['Reference'],
        summary: 'Справочник статусов аудиторий',
        response: { 200: T.Array(StatusRef), ...ErrorResponses },
      },
    },
    async () => app.prisma.roomStatus.findMany({ orderBy: { id: 'asc' } })
  )

  app.get(
    '/api/booking-statuses',
    {
      schema: {
        operationId: 'listBookingStatuses',
        tags: ['Reference'],
        summary: 'Справочник статусов бронирований',
        response: { 200: T.Array(StatusRef), ...ErrorResponses },
      },
    },
    async () => app.prisma.bookingStatus.findMany({ orderBy: { id: 'asc' } })
  )
}

export default referenceRoutes
