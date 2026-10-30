import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { hashPassword } from '../lib/password.js'

/**
 * Идемпотентное заполнение БД: справочники обновляются, демо-данные создаются только если их ещё нет.
 * Запуск: npm run db:seed (в Docker выполняется автоматически после миграций).
 */

const ROOM_STATUSES = [
  { code: 'available', name: 'Доступна' },
  { code: 'booked', name: 'Забронирована' },
  { code: 'maintenance', name: 'На обслуживании' },
]

const BOOKING_STATUSES = [
  { code: 'pending', name: 'Ожидает подтверждения' },
  { code: 'confirmed', name: 'Подтверждено' },
  { code: 'rejected', name: 'Отклонено' },
  { code: 'cancelled', name: 'Отменено' },
  { code: 'completed', name: 'Завершено' },
]

const EQUIPMENT = [
  { code: 'projector', name: 'Проектор' },
  { code: 'wifi', name: 'Wi-Fi' },
  { code: 'microphone', name: 'Микрофон' },
  { code: 'computers', name: 'Компьютеры' },
  { code: 'board', name: 'Доска' },
]

interface SeedRoom {
  code: string
  name: string
  capacity: number
  equipment: string[]
  status: string
}

const ROOMS: SeedRoom[] = [
  { code: '101', name: 'Лекционная аудитория', capacity: 120, equipment: ['projector', 'wifi'], status: 'available' },
  { code: '102', name: 'Компьютерный класс', capacity: 30, equipment: ['computers', 'projector', 'board', 'wifi'], status: 'booked' },
  { code: '201', name: 'Конференц-зал', capacity: 50, equipment: ['projector', 'microphone', 'wifi'], status: 'available' },
  { code: '202', name: 'Семинарская', capacity: 25, equipment: ['board', 'wifi'], status: 'maintenance' },
  { code: '203', name: 'Лаборантская', capacity: 20, equipment: ['wifi', 'computers', 'board'], status: 'available' },
  { code: '301', name: 'Компьютерный класс', capacity: 20, equipment: ['wifi', 'computers', 'board', 'projector'], status: 'booked' },
  { code: '302', name: 'Лекционная аудитория', capacity: 100, equipment: ['wifi', 'board', 'projector'], status: 'available' },
]

function idOf(map: Map<string, number>, code: string): number {
  const id = map.get(code)
  if (id === undefined) throw new Error(`В справочнике нет записи с кодом "${code}"`)
  return id
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    // Справочники
    const roomStatusIds = new Map<string, number>()
    for (const item of ROOM_STATUSES) {
      const row = await prisma.roomStatus.upsert({ where: { code: item.code }, update: { name: item.name }, create: item })
      roomStatusIds.set(row.code, row.id)
    }

    const bookingStatusIds = new Map<string, number>()
    for (const item of BOOKING_STATUSES) {
      const row = await prisma.bookingStatus.upsert({ where: { code: item.code }, update: { name: item.name }, create: item })
      bookingStatusIds.set(row.code, row.id)
    }

    const equipmentIds = new Map<string, number>()
    for (const item of EQUIPMENT) {
      const row = await prisma.equipment.upsert({ where: { code: item.code }, update: { name: item.name }, create: item })
      equipmentIds.set(row.code, row.id)
    }

    // Демо-пользователи
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Администратор',
        role: 'ADMIN',
        passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'admin123'),
      },
    })
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: 'Иван Иванов',
        role: 'USER',
        passwordHash: hashPassword(process.env.SEED_USER_PASSWORD ?? 'user123'),
      },
    })

    // Аудитории
    for (const room of ROOMS) {
      await prisma.room.upsert({
        where: { id: room.code },
        update: {},
        create: {
          id: room.code,
          code: room.code,
          name: room.name,
          capacity: room.capacity,
          statusId: idOf(roomStatusIds, room.status),
          equipment: { create: room.equipment.map((code) => ({ equipmentId: idOf(equipmentIds, code) })) },
        },
      })
    }

    // Демо-бронь и уведомления — только в пустой базе
    if ((await prisma.booking.count()) === 0) {
      const booking = await prisma.booking.create({
        data: {
          roomId: '102',
          userId: user.id,
          statusId: idOf(bookingStatusIds, 'confirmed'),
          startsAt: new Date('2026-10-25T08:00:00.000Z'),
          endsAt: new Date('2026-10-25T12:00:00.000Z'),
          purpose: 'Лабораторная работа',
        },
      })
      await prisma.notification.create({
        data: {
          userId: user.id,
          bookingId: booking.id,
          type: 'BOOKING_CREATED',
          title: 'Бронирование создано',
          message: 'Аудитория 102 (Компьютерный класс) забронирована на 2026-10-25, 08:00 – 12:00.',
        },
      })
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM',
          title: 'Добро пожаловать',
          message: 'База данных заполнена демонстрационными данными.',
        },
      })
    }

    console.log('[seed] готово')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error('[seed] ошибка:', err)
  process.exit(1)
})
