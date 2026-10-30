import { randomBytes } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { HttpError, type Role } from '../types.js'

/** Полезная нагрузка JWT: sub — идентификатор пользователя. */
export interface AuthPayload {
  sub: string
  email: string
  role: Role
}

/** Секрет подписи токенов. Если JWT_SECRET не задан, генерируем случайный (токены сбросятся при перезапуске). */
export function resolveJwtSecret(): { secret: string; generated: boolean } {
  const fromEnv = process.env.JWT_SECRET
  if (fromEnv) return { secret: fromEnv, generated: false }
  return { secret: randomBytes(32).toString('hex'), generated: true }
}

/** Проверяет Bearer-токен и возвращает данные пользователя или бросает 401. */
export async function requireUser(request: FastifyRequest): Promise<AuthPayload> {
  try {
    return await request.jwtVerify<AuthPayload>()
  } catch {
    throw new HttpError(401, 'Missing or invalid token')
  }
}

/** То же, что requireUser, но дополнительно требует роль ADMIN (иначе 403). */
export async function requireAdmin(request: FastifyRequest): Promise<AuthPayload> {
  const auth = await requireUser(request)
  if (auth.role !== 'ADMIN') throw new HttpError(403, 'Insufficient privileges')
  return auth
}
