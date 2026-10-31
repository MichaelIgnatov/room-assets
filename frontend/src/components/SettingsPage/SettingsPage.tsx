import { Box, Typography, Avatar, Button, Switch, FormControlLabel, Divider, Stack, TextField, alpha } from "@mui/material";
import { LightModeOutlined, DarkModeOutlined, SettingsBrightnessOutlined, LockOutlined, NotificationsOutlined, LogoutOutlined } from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../../context/auth"; 
import { useAppTheme } from "../../context/ThemeContext";
import { getInitials } from "../Header/header.utils";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  // Вытаскиваем метод signOut из контекста
  const { user, signOut } = useAuth(); 
  const { themeMode, setThemeMode } = useAppTheme();
  
  const [notifyBooking, setNotifyBooking] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  
  // Стейты для смены пароля
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const initials = user?.name ? getInitials(user.name) : "??";

  // Обработчик обновления пароля
  const handleChangePassword = async () => {
    if (!password.trim()) {
      alert("Пароль не может быть пустым");
      return;
    }
    if (password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setSubmittingPassword(true);
    try {
      const token = localStorage.getItem("rb:token");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        alert("Пароль успешно обновлен!");
        setPassword("");
      } else {
        const data = await response.json();
        alert(data.message || "Ошибка при смене пароля");
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось связаться с сервером");
    } finally {
      setSubmittingPassword(false);
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
          <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 24, fontWeight: 600 }}>
            {initials}
          </Avatar>
          
          <Box className={styles.profileInfo}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
              {user?.name || "Имя не указано"}
            </Typography>
            {/* Выводим реальный Email из базы данных */}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {user?.email || "email@example.com"}
            </Typography>
            {/* Выводим реальную роль из базы данных */}
            <Typography variant="caption" sx={{ mt: 0.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: "primary.main", px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 600, alignSelf: "flex-start" }}>
              Роль: {user?.role === "ADMIN" ? "Администратор" : "Пользователь"}
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
          Настройте каналы получения системных предупреждений и напоминаний о бронировании.
        </Typography>

        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={notifyBooking} onChange={(e) => setNotifyBooking(e.target.checked)} color="primary" size="small" />}
            label={<Typography variant="body2">Напоминать о начале бронирования за 15 минут</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} color="primary" size="small" />}
            label={<Typography variant="body2">Получать отчёты и уведомления на почту</Typography>}
          />
        </Stack>
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
          Периодически меняйте пароль, чтобы предотвратить несанкционированный доступ к вашей учётной записи ресурсы.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ maxWidth: 600, mt: 2 }}>
          <TextField 
            label="Новый пароль" 
            type="password" 
            size="small" 
            fullWidth 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submittingPassword}
          />
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ textTransform: "none", fontWeight: 600, height: 40, width: 180, minWidth: 180 }}
            onClick={handleChangePassword}
            disabled={submittingPassword}
          >
            {submittingPassword ? "Обновление..." : "Обновить пароль"}
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
          onClick={signOut} 
        >
          Выйти из аккаунта
        </Button>
      </Box>

    </Box>
  );
}
