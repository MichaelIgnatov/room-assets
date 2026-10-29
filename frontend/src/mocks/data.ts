import type { RoomsResponseDto } from "../api/roomsApi";

export const roomsPayload: RoomsResponseDto = {
  items: [
    { id: "201", code: "201", name: "Конференц-зал", capacity: 50, equipment: ["projector","microphone","wifi"], status: "available" },
    { id: "101", code: "101", name: "Лекционная аудитория", capacity: 120, equipment: ["projector","wifi"], status: "available" },
    { id: "102", code: "102", name: "Компьютерный класс", capacity: 30, equipment: ["computers","projector","board","wifi"], status: "booked" },
    { id: "202", code: "202", name: "Семинарская", capacity: 25, equipment: ["board","wifi"], status: "maintenance" },
    { id: "203", code: "203", name: "Лаборантская", capacity: 20, equipment: ["wifi","computers","board"], status: "available"},
    { id: "301", code: "301", name: "Компьютерный класс", capacity: 20, equipment: ["wifi","computers", "board", "projector"], status: "booked"},
    { id: "302", code: "302", name: "Лекционная аудитория", capacity: 100, equipment: ["wifi", "board", "projector"], status: "available"}, 
  ],
  page: 1,
  total: 156,
};