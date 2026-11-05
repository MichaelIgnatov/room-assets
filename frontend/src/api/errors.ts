import axios from "axios";

interface ProblemDetailsDto {
  title?: unknown;
  detail?: unknown;
}

function isObject(value: unknown): value is ProblemDetailsDto {
  return typeof value === "object" && value !== null;
}

/** HTTP-статус ответа сервера или undefined (сеть недоступна, таймаут и т.п.). */
export function getErrorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

/** Человекочитаемое сообщение из ответа Problem Details (detail/title) бэкенда. */
export function getErrorMessage(err: unknown, fallback = "Произошла ошибка"): string {
  if (axios.isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (isObject(data)) {
      if (typeof data.detail === "string" && data.detail !== "") return data.detail;
      if (typeof data.title === "string" && data.title !== "") return data.title;
    }
    if (!err.response) return "Сервер недоступен. Проверьте подключение к сети.";
  }
  if (err instanceof Error && err.message !== "") return err.message;
  return fallback;
}
