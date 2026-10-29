import clsx from "clsx";
import s from "./Header.module.css";
import type { NavItem } from "./header.types";
import { DEFAULT_NAV } from "./Header.config";
import { getInitials } from "./header.utils";
import { useAuth } from "../../context/auth";
import { DomainRounded, NotificationsNoneOutlined } from "@mui/icons-material";

export function Header({
  navItems = DEFAULT_NAV,
  activeNavId,
  onNavigate,
  onBellClick,
}: {
  navItems?: NavItem[];
  activeNavId: string;
  onNavigate: (id: string) => void;
  onBellClick?: () => void;
}) {
  const { user } = useAuth();

  return (
    <header className={s.header}>
      <div className={s.row}>
        <div className={s.brand}>
          <div className={s.logoBox} aria-hidden>
            <DomainRounded className={s.logoIc} />
          </div>
          <div className={s.app}>Room Booking</div>
        </div>

        <nav className={s.nav} aria-label="Основная навигация">
          {navItems?.map((item) => {
            const active = item.id === activeNavId;
            return (
              <button
                key={item.id}
                type="button"
                className={clsx(s.tab, active && s.tabActive)}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                title={item.label}
              >
                {item.icon && <item.icon className={s.tabIc} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={s.spacer} />

        <div className={s.right}>
          <button type="button" className={s.iconBtn} onClick={onBellClick} aria-label="Уведомления" title="Уведомления">
            <NotificationsNoneOutlined />
          </button>

          <div className={s.avatar} title={user?.name || "Гость"}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" width={32} height={32} style={{ borderRadius: "999px" }} />
            ) : (
              <span>{getInitials(user?.name)}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}