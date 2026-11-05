import { http } from "./http";
import type { UserRole } from "./authApi";

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

/** Список пользователей (только ADMIN). */
export async function fetchUsers(): Promise<UserDto[]> {
  const { data } = await http.get<UserDto[]>("/users");
  return data;
}
