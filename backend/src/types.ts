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

// Схема и тип пользователя, которые используются и в валидаторах, и в ответах API.
export const User = T.Object({
  id: T.String({ description: 'Уникальный идентификатор пользователя' }),
  email: T.String({ format: 'email', description: 'Адрес электронной почты' }),
})
export type User = Static<typeof User>

export const Health = T.Object({
  ok: T.Boolean({ description: 'Флаг готовности сервиса' }),
})
export type Health = Static<typeof Health>

// Схема аудитории (Room)
export const Room = T.Object({
  id: T.String({ description: 'Уникальный идентификатор аудитории' }),
  code: T.String({ description: 'Номер или короткий код кабинета (например, 101)' }),
  name: T.String({ description: 'Полное название ресурса (например, Конференц-зал)' }),
  capacity: T.Number({ description: 'Максимальная вместимость человек' }),
  equipment: T.Array(T.String(), { description: 'Список доступного оборудования в помещении' }),
  status: T.Union([
    T.Literal("available"),
    T.Literal("booked"),
    T.Literal("maintenance")
  ], { description: 'Текущее состояние доступности аудитории' }),
})
export type Room = Static<typeof Room>

// Схема бронирования (Booking)
export const Booking = T.Object({
  id: T.String({ description: 'Уникальный идентификатор записи бронирования' }),
  roomCode: T.String({ description: 'Код забронированной аудитории' }),
  roomName: T.String({ description: 'Название забронированного помещения' }),
  date: T.String({ description: 'Дата бронирования в формате ГГГГ-ММ-ДД' }),
  time: T.String({ description: 'Временной интервал' }),
  userId: T.String({ 
    description: 'Идентификатор пользователя, создавшего бронь'
  }),
})
export type Booking = Static<typeof Booking>

// Тело запроса при создании брони (POST)
export const CreateBookingBody = T.Object({
  roomCode: T.String({ description: 'Код аудитории, которую хочет занять пользователь' }),
  date: T.String({ description: 'Желаемая дата проведения мероприятия' }),
  timeStart: T.String({ description: 'Время начала встречи (например, 10:00)' }),
  timeEnd: T.String({ description: 'Время окончания встречи (например, 12:00)' }),
})
export type CreateBookingBody = Static<typeof CreateBookingBody>

export const UpdateRoomBody = T.Object({
  name: T.Optional(T.String({ 
    description: 'Новое название аудитории' 
  })),
  capacity: T.Optional(T.Number({ 
    description: 'Новая вместимость человек' 
  })),
  status: T.Optional(T.Union([
    T.Literal("available"),
    T.Literal("booked"),
    T.Literal("maintenance")
  ], { 
    description: 'Новый статус доступности' 
  })),
})
export type UpdateRoomBody = Static<typeof UpdateRoomBody>

// Схема для авторизации (Вход)
export const LoginBody = T.Object({
  email: T.String({ 
    format: 'email', 
    description: 'Почта пользователя для входа' 
  }),
  password: T.String({ 
    description: 'Пароль пользователя' 
  }),
})
export type LoginBody = Static<typeof LoginBody>
