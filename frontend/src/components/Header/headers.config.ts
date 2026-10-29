import type { NavItem } from "./header.types";
import { ListAltOutlined, EventNoteOutlined, SettingsOutlined } from "@mui/icons-material";

export const DEFAULT_NAV: NavItem[] = [
  { id: "catalog",  label: "Каталог аудиторий",    icon: ListAltOutlined },
  { id: "bookings", label: "Управление бронированием", icon: EventNoteOutlined },
  { id: "settings", label: "Настройки",            icon: SettingsOutlined },
];