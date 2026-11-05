import { http } from "./http";

export type UserRole = "USER" | "ADMIN";

export interface AuthUserDto {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface AuthResponseDto {
  token: string;
  user: AuthUserDto;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponseDto> {
  const { data } = await http.post<AuthResponseDto>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthResponseDto> {
  const { data } = await http.post<AuthResponseDto>("/auth/register", payload);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUserDto> {
  const { data } = await http.get<AuthUserDto>("/auth/me");
  return data;
}

export async function logoutRequest(): Promise<void> {
  await http.post("/auth/logout");
}

export async function changePasswordRequest(currentPassword: string, newPassword: string): Promise<void> {
  await http.post("/auth/change-password", { currentPassword, newPassword });
}
