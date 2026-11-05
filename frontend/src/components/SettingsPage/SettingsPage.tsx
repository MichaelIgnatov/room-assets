import { Box, Typography, Avatar, Button, Switch, FormControlLabel, Divider, Stack, TextField, Alert, CircularProgress, alpha } from "@mui/material";
import { LightModeOutlined, DarkModeOutlined, SettingsBrightnessOutlined, LockOutlined, NotificationsOutlined, LogoutOutlined } from "@mui/icons-material";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/auth"; 
import { useAppTheme } from "../../context/ThemeContext";
import { changePasswordRequest } from "../../api/authApi";
import { getErrorMessage } from "../../api/errors";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsDto,
} from "../../api/notificationsApi";
import { getInitials } from "../Header/header.utils";
import styles from "./SettingsPage.module.css";

interface FormResult {
  severity: "success" | "error";
  text: string;
}

export function SettingsPage() {
  const { user, isAdmin, signOut } = useAuth(); 
  const { themeMode, setThemeMode } = useAppTheme();

  // Настройки уведомлений хранятся на сервере (GET/PATCH /api/notifications/settings)
  const [settings, setSettings] = useState<NotificationSettingsDto | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Смена пароля (POST /api/auth/change-password)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordResult, setPasswordResult] = useState<FormResult | null>(null);

  const displayName = user?.name || user?.email || "";
  const initials = displayName ? getInitials(displayName) : "??";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchNotificationSettings();
        if (active) setSettings(data);
      } catch (e) {
        if (active) setSettingsError(getErrorMessage(e, "Не удалось загрузить настройки уведомлений"));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async (key: keyof NotificationSettingsDto, checked: boolean) => {
    if (!settings) return;
    const previous = settings;
    const patch: Partial<NotificationSettingsDto> =
      key === "notifyBooking" ? { notifyBooking: checked } : { notifyEmail: checked };

    // Оптимистичное обновление: при ошибке возвращаем прежнее значение
    setSettings({ ...settings, ...patch });
    setSettingsError(null);
    try {
      setSettings(await updateNotificationSettings(patch));
    } catch (e) {
      setSettings(previous);
      setSettingsError(getErrorMessage(e, "Не удалось сохранить настройку"));
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordResult(null);

    if (currentPassword === "") {
      setPasswordResult({ severity: "error", text: "Введите текущий пароль" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordResult({ severity: "error", text: "Новый пароль должен быть не короче 6 символов" });
      return;
    }

    setPasswordBusy(true);
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordResult({ severity: "success", text: "Пароль успешно обновлён" });
    } catch (err) {
      setPasswordResult({ severity: "error", text: getErrorMessage(err, "Не удалось обновить пароль") });
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <Box className={styles.cardBlock} sx={{ textAlign: "left", bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider", boxShadow: 1 }}>
      
      <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary", mb: 3 }}>
        Настройки аккаунта
      </Typography>

      {/* ПРОФИЛЬ */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}>
          Личный профиль
        </Typography>
        
        <Box className={styles.profileRow}>
          {/* Динамический аватар */}
          <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 24, fontWeight: 600 }}>
            {initials}
          </Avatar>
          
          <Box className={styles.profileInfo}>
            {/* Имя пользователя */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
              {user?.name || "Имя не указано"}
            </Typography>
            {/* Email из профиля */}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {user?.email ?? ""}
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: "primary.main", px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 600, alignSelf: "flex-start" }}>
              Роль: {isAdmin ? "Администратор" : "Пользователь"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3, borderColor: "divider" }} />

      {/* ВНЕШНИЙ ВИД */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
          Внешний вид
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Выберите, как будет выглядеть интерфейс приложения Room & Assets на вашем устройстве.
        </Typography>

        <Box className={styles.themeGroup}>
          <Button
            variant={themeMode === "light" ? "contained" : "outlined"}
            color={themeMode === "light" ? "primary" : "inherit"}
            startIcon={<LightModeOutlined />}
            onClick={() => setThemeMode("light")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Светлая
          </Button>

          <Button
            variant={themeMode === "dark" ? "contained" : "outlined"}
            color={themeMode === "dark" ? "primary" : "inherit"}
            startIcon={<DarkModeOutlined />}
            onClick={() => setThemeMode("dark")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Тёмная
          </Button>

          <Button
            variant={themeMode === "system" ? "contained" : "outlined"}
            color={themeMode === "system" ? "primary" : "inherit"}
            startIcon={<SettingsBrightnessOutlined />}
            onClick={() => setThemeMode("system")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Системная
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 3, borderColor: "divider" }} />

      {/* УВЕДОМЛЕНИЯ */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <NotificationsOutlined fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
            Уведомления
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Настройте, какие уведомления вы хотите получать о своих бронированиях.
        </Typography>

        {settingsError && <Alert severity="error" sx={{ mb: 2 }}>{settingsError}</Alert>}

        {settings === null && !settingsError ? (
          <CircularProgress size={22} />
        ) : (
          <Stack spacing={1}>
            <FormControlLabel
              disabled={settings === null}
              control={<Switch checked={settings?.notifyBooking ?? false} onChange={(e) => void handleToggle("notifyBooking", e.target.checked)} color="primary" size="small" />}
              label={<Typography variant="body2">Уведомлять о создании, изменении и отмене бронирований</Typography>}
            />
            <FormControlLabel
              disabled={settings === null}
              control={<Switch checked={settings?.notifyEmail ?? false} onChange={(e) => void handleToggle("notifyEmail", e.target.checked)} color="primary" size="small" />}
              label={<Typography variant="body2">Дублировать уведомления на почту {user?.email ?? ""}</Typography>}
            />
          </Stack>
        )}
      </Box>

      <Divider sx={{ my: 3, borderColor: "divider" }} />

      {/* БЕЗОПАСНОСТЬ */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <LockOutlined fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
            Безопасность
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Периодически меняйте пароль, чтобы предотвратить несанкционированный доступ к вашей учётной записи.
        </Typography>

        <Stack component="form" onSubmit={handlePasswordSubmit} spacing={2} sx={{ maxWidth: 400, mt: 2 }}>
          {passwordResult && <Alert severity={passwordResult.severity}>{passwordResult.text}</Alert>}
          <TextField
            label="Текущий пароль"
            type="password"
            size="small"
            fullWidth
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="Новый пароль"
            type="password"
            size="small"
            fullWidth
            autoComplete="new-password"
            placeholder="Не короче 6 символов"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="outlined"
            color="primary"
            disabled={passwordBusy}
            startIcon={passwordBusy ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ textTransform: "none", fontWeight: 600, height: 40, alignSelf: "flex-start", minWidth: 180 }}
          >
            Обновить пароль
          </Button>
        </Stack>
      </Box>    

      <Divider sx={{ my: 3, borderColor: "divider" }} />

      {/* ВЫХОД ИЗ СИСТЕМЫ */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button 
          variant="text" 
          color="error" 
          startIcon={<LogoutOutlined />}
          sx={{ textTransform: "none", fontWeight: 600 }}
          onClick={() => signOut()}
        >
          Выйти из аккаунта
        </Button>
      </Box>

    </Box>
  );
}
