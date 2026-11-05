// Хранение JWT в localStorage и уведомление приложения о том, что сервер отклонил токен (401).

const TOKEN_KEY = "rb:token";

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage недоступен (например, приватный режим): токен будет жить только до перезагрузки
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ничего не делаем: удалять нечего
  }
}

/** Подписка на «токен недействителен». Возвращает функцию отписки. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => listener());
}
