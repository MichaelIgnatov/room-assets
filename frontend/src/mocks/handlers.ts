import { http as msw, HttpResponse } from "msw";
import { roomsPayload } from "./data";

export const handlers = [
  msw.get("/api/rooms", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    return HttpResponse.json({ ...roomsPayload, page });
  }),
];