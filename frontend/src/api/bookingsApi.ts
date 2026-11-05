import { http } from "./http";

/** Бронь в формате ответа бэкенда (плоская структура). */
export interface BookingDto {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  /** ГГГГ-ММ-ДД */
  date: string;
  /** «10:00 - 12:00» */
  time: string;
  timeStart: string;
  timeEnd: string;
  /** Код статуса: pending, confirmed, rejected, cancelled, completed */
  status: string;
  purpose?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
}

export interface CreateBookingPayload {
  roomCode: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  purpose?: string;
  /** Только ADMIN: создать бронь от имени другого пользователя */
  userId?: string;
}

export interface BookingsFilter {
  /** Только ADMIN: все брони */
  all?: boolean;
  /** Только ADMIN: брони конкретного пользователя */
  userId?: string;
}

/** Без фильтра возвращает брони текущего пользователя. */
export async function fetchBookings(filter?: BookingsFilter): Promise<BookingDto[]> {
  const { data } = await http.get<BookingDto[]>("/bookings", { params: filter });
  return data;
}

/** Бросает ошибку с HTTP 409, если время пересекается с другой бронью. */
export async function createBooking(payload: CreateBookingPayload): Promise<BookingDto> {
  const { data } = await http.post<BookingDto>("/bookings", payload);
  return data;
}

/** Отмена и удаление брони — одно действие (DELETE): запись получает статус «cancelled». */
export async function cancelBooking(id: string): Promise<void> {
  await http.delete(`/bookings/${encodeURIComponent(id)}`);
}
