import { HttpError, type Booking, type Notification, type Role, type Room, type User } from '../types.js'

// Аудитории

/** Что подгружать вместе с аудиторией, чтобы собрать ответ API. */
export const roomInclude = {
  status: true,
  equipment: { include: { equipment: true } },
} as const

export interface RoomRow {
  id: string
  code: string
  name: string
  capacity: number
  description: string | null
  status: { code: string }
  equipment: { equipment: { code: string } }[]
}

export function toRoomDto(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    capacity: row.capacity,
    description: row.description ?? undefined,
    equipment: row.equipment.map((link) => link.equipment.code),
    status: row.status.code,
  }
}

// Бронирования

/** Брони с этими статусами не занимают аудиторию. */
export const FREE_BOOKING_STATUSES = ['cancelled', 'rejected']

export const bookingInclude = {
  room: { select: { code: true, name: true } },
  status: { select: { code: true } },
  user: { select: { email: true, name: true } },
} as const

export interface BookingRow {
  id: string
  roomId: string
  userId: string
  startsAt: Date
  endsAt: Date
  purpose: string | null
  room: { code: string; name: string }
  status: { code: string }
  user: { email: string; name: string | null }
}

// Время хранится «как введено» (UTC без пересчёта часовых поясов), поэтому и читаем его как UTC.
export const dateOf = (d: Date): string => d.toISOString().slice(0, 10)
export const timeOf = (d: Date): string => d.toISOString().slice(11, 16)

export function toBookingDto(row: BookingRow): Booking {
  const timeStart = timeOf(row.startsAt)
  const timeEnd = timeOf(row.endsAt)
  return {
    id: row.id,
    roomId: row.roomId,
    roomCode: row.room.code,
    roomName: row.room.name,
    date: dateOf(row.startsAt),
    time: `${timeStart} - ${timeEnd}`,
    timeStart,
    timeEnd,
    status: row.status.code,
    purpose: row.purpose ?? undefined,
    userId: row.userId,
    userEmail: row.user.email,
    userName: row.user.name ?? undefined,
  }
}

/** Преобразует дату и время из запроса в интервал. Бросает 400, если интервал некорректен. */
export function parseSlot(date: string, timeStart: string, timeEnd: string): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(`${date}T${timeStart}:00.000Z`)
  const endsAt = new Date(`${date}T${timeEnd}:00.000Z`)

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new HttpError(400, 'Некорректная дата или время')
  }
  if (endsAt <= startsAt) {
    throw new HttpError(400, 'Время окончания должно быть позже времени начала')
  }
  return { startsAt, endsAt }
}

export function formatTime(d: Date): string {
  return timeOf(d)
}

// Уведомления

export interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  bookingId: string | null
  createdAt: Date
}

export function toNotificationDto(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    bookingId: row.bookingId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }
}

// Пользователи

export interface UserRow {
  id: string
  email: string
  name: string | null
  role: Role
}

export function toUserDto(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name ?? undefined, role: row.role }
}
