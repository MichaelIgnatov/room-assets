import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (r) => r,
  (err) => { console.error("HTTP error:", err); throw err; }
);