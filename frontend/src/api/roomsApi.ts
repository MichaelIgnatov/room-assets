import { http } from "./http";

export type RoomStatus = "available" | "booked" | "maintenance";

export interface RoomDto {
  id: string;
  code: string;
  name: string;
  capacity: number;
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
