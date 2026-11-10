import axios from "axios";
import { clearToken, getToken, notifyUnauthorized } from "./tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

const CREDENTIAL_ENDPOINTS = ["/auth/login", "/auth/register"];

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const url = err.config?.url ?? "";
      if (!CREDENTIAL_ENDPOINTS.some((endpoint) => url.endsWith(endpoint))) {
        clearToken();
        notifyUnauthorized();
      }
    }
    console.error("HTTP error:", err);
    return Promise.reject(err);
  }
);
