import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import { NotificationsNoneOutlined } from "@mui/icons-material";
import s from "../Header/Header.module.css";
import { getErrorMessage } from "../../api/errors";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from "../../api/notificationsApi";

const POLL_INTERVAL_MS = 30_000;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

/** Колокольчик в шапке: счётчик непрочитанных (GET /api/notifications) и выпадающий список уведомлений. */
export function NotificationsBell() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await fetchNotifications());
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e, "Не удалось загрузить уведомления"));
    }
  }, []);

  // Первая загрузка и периодическое обновление счётчика
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const open = anchorEl !== null;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    void load();
  };

  const handleRead = async (notification: NotificationDto) => {
    if (notification.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationRead(notification.id);
    } catch {
      void load(); // откатываем оптимистичное обновление актуальными данными сервера
    }
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  };

  return (
    <>
      <button
        type="button"
        className={s.iconBtn}
        onClick={handleOpen}
        aria-label={unreadCount > 0 ? `Уведомления: непрочитанных ${unreadCount}` : "Уведомления"}
        title="Уведомления"
      >
        <Badge badgeContent={unreadCount} color="primary" max={99}>
          <NotificationsNoneOutlined />
        </Badge>
      </button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ width: { xs: 300, sm: 380 }, maxWidth: "100vw" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Уведомления
            </Typography>
            <Button size="small" onClick={() => void handleReadAll()} disabled={unreadCount === 0} sx={{ textTransform: "none" }}>
              Прочитать все
            </Button>
          </Box>
          <Divider />

          {error && (
            <Typography variant="body2" color="error" sx={{ px: 2, py: 1.5 }}>
              {error}
            </Typography>
          )}

          {!error && items.length === 0 && (
            <Typography variant="body2" sx={{ px: 2, py: 3, color: "text.secondary", textAlign: "center" }}>
              Уведомлений пока нет
            </Typography>
          )}

          <List disablePadding sx={{ maxHeight: 400, overflowY: "auto" }}>
            {items.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => void handleRead(n)}
                sx={{ alignItems: "flex-start", bgcolor: n.isRead ? "transparent" : "action.hover" }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: n.isRead ? 400 : 700 }}>
                      {n.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" sx={{ display: "block", color: "text.secondary" }}>
                        {n.message}
                      </Typography>
                      <Typography component="span" variant="caption" sx={{ color: "text.disabled" }}>
                        {formatDateTime(n.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}
