import { http } from "./http";

export type RoomStatus = "available" | "booked" | "maintenance";

export interface RoomDto {
  id: string;
  code: string;
  name: string;
  capacity: number;
  description?: string;
  equipment: string[];
  status: RoomStatus;
}

export interface RoomsResponseDto {
  items: RoomDto[];
  page: number;
  total: number;
}

export async function fetchRooms(page = 1): Promise<RoomsResponseDto> {
  const { data } = await http.get<RoomsResponseDto | RoomDto[]>("/rooms", { params: { page } });

  if (Array.isArray(data)) {
    return { items: data, page, total: data.length };
  }
  return data;
}

export interface CatalogFiltersState {
  search: string;
  status: string;
  capacity: string;
  selectedEquipment: string[];
}

// ---------- Справочники ----------

export interface EquipmentDto {
  id: number;
  code: string;
  name: string;
}

export interface StatusRefDto {
  id: number;
  code: string;
  name: string;
}

export async function fetchEquipment(): Promise<EquipmentDto[]> {
  const { data } = await http.get<EquipmentDto[]>("/equipment");
  return data;
}

export async function fetchRoomStatuses(): Promise<StatusRefDto[]> {
  const { data } = await http.get<StatusRefDto[]>("/room-statuses");
  return data;
}

// ---------- Управление аудиториями (ADMIN) ----------

export interface RoomPayload {
  code: string;
  name: string;
  capacity: number;
  description: string;
  /** Коды оборудования; при редактировании список заменяется целиком */
  equipment: string[];
  /** Код статуса из справочника */
  status: string;
}

export async function createRoom(payload: RoomPayload): Promise<RoomDto> {
  const { data } = await http.post<RoomDto>("/rooms", payload);
  return data;
}

export async function updateRoom(id: string, payload: RoomPayload): Promise<RoomDto> {
  const { data } = await http.put<RoomDto>(`/rooms/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteRoom(id: string): Promise<void> {
  await http.delete(`/rooms/${encodeURIComponent(id)}`);
}

// ---------- Расписание ----------

export interface ScheduleSlotDto {
  bookingId: string;
  from: string;
  to: string;
  title?: string;
  status: string;
}

export async function fetchRoomSchedule(roomId: string, date: string): Promise<ScheduleSlotDto[]> {
  const { data } = await http.get<ScheduleSlotDto[]>(`/rooms/${encodeURIComponent(roomId)}/schedule`, {
    params: { date },
  });
  return data;
}
