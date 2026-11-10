import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { hashPassword } from '../lib/password.js'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const DEMO_ENABLED = (process.env.SEED_DEMO ?? (IS_PRODUCTION ? 'false' : 'true')) === 'true'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || (IS_PRODUCTION ? undefined : 'admin123')
const USER_PASSWORD = process.env.SEED_USER_PASSWORD || (IS_PRODUCTION ? undefined : 'user123')

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

    let adminId: string | null = null
    if (ADMIN_PASSWORD !== undefined) {
      const admin = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},
        create: {
          email: ADMIN_EMAIL,
          name: 'Администратор',
          role: 'ADMIN',
          passwordHash: hashPassword(ADMIN_PASSWORD),
        },
      })
      adminId = admin.id
    } else {
      console.log('[seed] SEED_ADMIN_PASSWORD не задан: администратор не создан')
    }

    if (!DEMO_ENABLED) {
      console.log('[seed] демо-данные отключены (SEED_DEMO=false): созданы только справочники')
    } else {
      let demoUserId: string | null = null
      if (USER_PASSWORD !== undefined) {
        const user = await prisma.user.upsert({
          where: { email: 'user@example.com' },
          update: {},
          create: {
            email: 'user@example.com',
            name: 'Иван Иванов',
            role: 'USER',
            passwordHash: hashPassword(USER_PASSWORD),
          },
        })
        demoUserId = user.id

        await prisma.user.upsert({
          where: { email: 'test@example.com' },
          update: {},
          create: {
            email: 'test@example.com',
            name: 'Сергей Сергеев',
            role: 'USER',
            passwordHash: hashPassword(USER_PASSWORD),
          },
        })
      } else {
        console.log('[seed] SEED_USER_PASSWORD не задан: демо-пользователи не созданы')
      }

      for (const room of ROOMS) {
        await prisma.room.upsert({
          where: { code: room.code },
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

      if (demoUserId !== null && (await prisma.booking.count()) === 0) {
        const booking = await prisma.booking.create({
          data: {
            roomId: '102',
            userId: demoUserId,
            statusId: idOf(bookingStatusIds, 'confirmed'),
            startsAt: new Date('2026-10-25T08:00:00.000Z'),
            endsAt: new Date('2026-10-25T12:00:00.000Z'),
            purpose: 'Лабораторная работа',
          },
        })
        await prisma.notification.create({
          data: {
            userId: demoUserId,
            bookingId: booking.id,
            type: 'BOOKING_CREATED',
            title: 'Бронирование создано',
            message: 'Аудитория 102 (Компьютерный класс) забронирована на 2026-10-25, 08:00 – 12:00.',
          },
        })
        if (adminId !== null) {
          await prisma.notification.create({
            data: {
              userId: adminId,
              type: 'SYSTEM',
              title: 'Добро пожаловать',
              message: 'База данных заполнена демонстрационными данными.',
            },
          })
        }
      }
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
