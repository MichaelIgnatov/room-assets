import type { FastifyError, FastifySchemaValidationError } from 'fastify'
import type { SchemaErrorDataVar } from 'fastify/types/schema.js'
import { Type as T, type Static } from '@sinclair/typebox'

// Схемы вынесены отдельно — одни и те же объекты питают и валидацию, и генерацию OpenAPI.

/**
 * Обёртка над стандартной ошибкой Fastify для случаев, когда схема запроса не проходит валидацию.
 * Мы расширяем Error, чтобы получить сообщение и stack trace, и одновременно реализуем FastifyError,
 * чтобы Fastify понимал код ошибки и корректно возвращал ответ клиенту.
 */
export class ValidationProblem extends Error implements FastifyError {
  public readonly name = 'ValidationError'
  public readonly code = 'FST_ERR_VALIDATION'
  public readonly statusCode = 400
  public readonly validation: FastifySchemaValidationError[]
  public readonly validationContext: SchemaErrorDataVar

  constructor(
    message: string,
    errs: FastifySchemaValidationError[],
    ctx: SchemaErrorDataVar,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.validation = errs
    this.validationContext = ctx
  }
}

/**
 * Ошибка с HTTP-статусом. Бросается из обработчиков маршрутов (401, 403, 404, 409...) —
 * глобальный обработчик превращает её в ответ формата Problem Details.
 */
export class HttpError extends Error implements FastifyError {
  public readonly name = 'HttpError'
  public readonly code: string
  public readonly statusCode: number

  constructor(statusCode: number, message: string, code = 'HTTP_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

// Схема ответа RFC 9457 (Problem Details) — единый JSON-формат для сообщений об ошибках.
export const ProblemDetails = T.Object(
  {
    type: T.String({ description: 'URI с подробным описанием ошибки (по умолчанию about:blank)' }),
    title: T.String({ description: 'Короткое человекочитаемое резюме проблемы' }),
    status: T.Integer({ minimum: 100, maximum: 599, description: 'HTTP-статус, с которым был отправлен ответ' }),
    detail: T.Optional(T.String({ description: 'Дополнительные сведения о том, что пошло не так' })),
    instance: T.Optional(T.String({ description: 'URI запроса, в котором возникла проблема' })),
    errorsText: T.Optional(T.String({ description: 'Сводное описание всех ошибок, собранных валидацией Fastify' })),
  },
  { additionalProperties: true }
)
export type ProblemDetails = Static<typeof ProblemDetails>

// Типовые ответы с ошибками, чтобы не повторять их в каждом маршруте.
export const ErrorResponses = {
  400: ProblemDetails,
  401: ProblemDetails,
  403: ProblemDetails,
  404: ProblemDetails,
  409: ProblemDetails,
  429: ProblemDetails,
  500: ProblemDetails,
}

export const IdParams = T.Object({ id: T.String({ description: 'Идентификатор записи' }) })
export type IdParams = Static<typeof IdParams>

export const Health = T.Object({
  ok: T.Boolean({ description: 'Флаг готовности сервиса' }),
})
export type Health = Static<typeof Health>

// Пользователи и роли
export const Role = T.Union([T.Literal('USER'), T.Literal('ADMIN')], {
  description: 'Роль пользователя: USER — обычный пользователь, ADMIN — администратор',
})
export type Role = Static<typeof Role>

export const User = T.Object({
  id: T.String({ description: 'Уникальный идентификатор пользователя' }),
  email: T.String({ format: 'email', description: 'Адрес электронной почты' }),
  name: T.Optional(T.String({ description: 'Имя пользователя' })),
  role: Role,
})
export type User = Static<typeof User>

export const RegisterBody = T.Object({
  email: T.String({ format: 'email', description: 'Почта для входа' }),
  password: T.String({ minLength: 6, description: 'Пароль (не короче 6 символов)' }),
  name: T.Optional(T.String({ minLength: 1, description: 'Имя пользователя' })),
})
export type RegisterBody = Static<typeof RegisterBody>

// Схема для авторизации (Вход)
export const LoginBody = T.Object({
  email: T.String({ format: 'email', description: 'Почта пользователя для входа' }),
  password: T.String({ description: 'Пароль пользователя' }),
})
export type LoginBody = Static<typeof LoginBody>

export const AuthResponse = T.Object({
  token: T.String({ description: 'JWT. Передаётся в заголовке Authorization: Bearer <token>' }),
  user: User,
})
export type AuthResponse = Static<typeof AuthResponse>

export const ChangeRoleBody = T.Object({ role: Role })
export type ChangeRoleBody = Static<typeof ChangeRoleBody>

// Справочники

export const Equipment = T.Object({
  id: T.Integer(),
  code: T.String({ description: 'Код оборудования (projector, wifi...)' }),
  name: T.String({ description: 'Название для отображения' }),
})
export type Equipment = Static<typeof Equipment>

export const StatusRef = T.Object({
  id: T.Integer(),
  code: T.String({ description: 'Код статуса' }),
  name: T.String({ description: 'Название для отображения' }),
})
export type StatusRef = Static<typeof StatusRef>

// Аудитории

// Схема аудитории (Room)
export const Room = T.Object({
  id: T.String({ description: 'Уникальный идентификатор аудитории' }),
  code: T.String({ description: 'Номер или короткий код кабинета (например, 101)' }),
  name: T.String({ description: 'Полное название ресурса (например, Конференц-зал)' }),
  capacity: T.Integer({ description: 'Максимальная вместимость человек' }),
  description: T.Optional(T.String({ description: 'Дополнительное описание' })),
  equipment: T.Array(T.String(), { description: 'Коды доступного оборудования в помещении' }),
  status: T.String({ description: 'Код статуса аудитории (available, booked, maintenance)' }),
})
export type Room = Static<typeof Room>

export const CreateRoomBody = T.Object({
  code: T.String({ minLength: 1, description: 'Номер или код кабинета' }),
  name: T.String({ minLength: 1, description: 'Название аудитории' }),
  capacity: T.Integer({ minimum: 1, description: 'Вместимость' }),
  description: T.Optional(T.String()),
  equipment: T.Optional(T.Array(T.String(), { description: 'Коды оборудования' })),
  status: T.Optional(T.String({ description: 'Код статуса (по умолчанию available)' })),
})
export type CreateRoomBody = Static<typeof CreateRoomBody>

export const UpdateRoomBody = T.Object({
  code: T.Optional(T.String({ minLength: 1, description: 'Новый номер или код кабинета' })),
  name: T.Optional(T.String({ minLength: 1, description: 'Новое название аудитории' })),
  capacity: T.Optional(T.Integer({ minimum: 1, description: 'Новая вместимость человек' })),
  description: T.Optional(T.String({ description: 'Новое описание' })),
  equipment: T.Optional(T.Array(T.String(), { description: 'Полный новый список кодов оборудования' })),
  status: T.Optional(T.String({ description: 'Код нового статуса доступности' })),
})
export type UpdateRoomBody = Static<typeof UpdateRoomBody>

export const ScheduleQuery = T.Object({
  date: T.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Дата в формате ГГГГ-ММ-ДД' }),
})
export type ScheduleQuery = Static<typeof ScheduleQuery>

export const ScheduleSlot = T.Object({
  bookingId: T.String(),
  from: T.String({ description: 'Начало занятости (ЧЧ:ММ)' }),
  to: T.String({ description: 'Конец занятости (ЧЧ:ММ)' }),
  title: T.Optional(T.String({ description: 'Цель бронирования' })),
  status: T.String({ description: 'Код статуса брони' }),
})
export type ScheduleSlot = Static<typeof ScheduleSlot>

// Бронирования

// Схема бронирования (Booking)
export const Booking = T.Object({
  id: T.String({ description: 'Уникальный идентификатор записи бронирования' }),
  roomId: T.String({ description: 'Идентификатор забронированной аудитории' }),
  roomCode: T.String({ description: 'Код забронированной аудитории' }),
  roomName: T.String({ description: 'Название забронированного помещения' }),
  date: T.String({ description: 'Дата бронирования в формате ГГГГ-ММ-ДД' }),
  time: T.String({ description: 'Временной интервал (например, 10:00 - 12:00)' }),
  timeStart: T.String({ description: 'Время начала (ЧЧ:ММ)' }),
  timeEnd: T.String({ description: 'Время окончания (ЧЧ:ММ)' }),
  status: T.String({ description: 'Код статуса брони (pending, confirmed, rejected, cancelled, completed)' }),
  purpose: T.Optional(T.String({ description: 'Цель бронирования' })),
  userId: T.String({ description: 'Идентификатор пользователя, создавшего бронь' }),
})
export type Booking = Static<typeof Booking>

// Тело запроса при создании брони (POST)
export const CreateBookingBody = T.Object({
  roomCode: T.String({ description: 'Код аудитории, которую хочет занять пользователь' }),
  date: T.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Дата проведения мероприятия (ГГГГ-ММ-ДД)' }),
  timeStart: T.String({ pattern: '^\\d{2}:\\d{2}$', description: 'Время начала встречи (например, 10:00)' }),
  timeEnd: T.String({ pattern: '^\\d{2}:\\d{2}$', description: 'Время окончания встречи (например, 12:00)' }),
  purpose: T.Optional(T.String({ description: 'Цель бронирования' })),
})
export type CreateBookingBody = Static<typeof CreateBookingBody>

export const BookingsQuery = T.Object({
  all: T.Optional(T.Boolean({ description: 'Только для ADMIN: вернуть брони всех пользователей' })),
})
export type BookingsQuery = Static<typeof BookingsQuery>

export const UpdateBookingStatusBody = T.Object({
  status: T.String({ description: 'Код нового статуса брони' }),
})
export type UpdateBookingStatusBody = Static<typeof UpdateBookingStatusBody>

// Уведомления

export const Notification = T.Object({
  id: T.String(),
  type: T.String({ description: 'BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_STATUS_CHANGED или SYSTEM' }),
  title: T.String(),
  message: T.String(),
  isRead: T.Boolean(),
  bookingId: T.Optional(T.String({ description: 'Связанное бронирование' })),
  createdAt: T.String({ description: 'Дата создания (ISO 8601)' }),
})
export type Notification = Static<typeof Notification>

export const NotificationsQuery = T.Object({
  unread: T.Optional(T.Boolean({ description: 'Вернуть только непрочитанные' })),
})
export type NotificationsQuery = Static<typeof NotificationsQuery>

export const UnreadCount = T.Object({ count: T.Integer() })
export type UnreadCount = Static<typeof UnreadCount>

export const UpdatedCount = T.Object({ updated: T.Integer() })
export type UpdatedCount = Static<typeof UpdatedCount>
