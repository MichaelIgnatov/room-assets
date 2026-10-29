import { Box, Typography, Avatar, Button, Switch, FormControlLabel, Divider, Stack, TextField } from "@mui/material";
import { LightModeOutlined, DarkModeOutlined, SettingsBrightnessOutlined, LockOutlined, NotificationsOutlined, LogoutOutlined } from "@mui/icons-material";
import { useState } from "react";
// ИМПОРТ: Подключаем хук авторизации из контекста вашего проекта
import { useAuth } from "../../context/auth"; 
import { getInitials } from "../Header/header.utils"; // Подключаем вашу утилиту для инициалов
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  // Достаем данные текущего авторизованного пользователя из глобального контекста лабы 4
  const { user } = useAuth(); 

  // Локальные состояния макета для кнопок и тумблеров
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [notifyBooking, setNotifyBooking] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  // Получаем инициалы из имени пользователя, который лежит в контексте
  const initials = user?.name ? getInitials(user.name) : "??";

  return (
    <Box className={styles.cardBlock} sx={{ textAlign: "left" }}>
      
      <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary", mb: 3 }}>
        Настройки аккаунта
      </Typography>

      {/* ================= СЕКЦИЯ 1: ПРОФИЛЬ ================= */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}>
          Личный профиль
        </Typography>
        
        <Box className={styles.profileRow}>
          {/* Динамический аватар: отображает инициалы из AuthContext */}
          <Avatar sx={{ width: 72, height: 72, bgcolor: "#aa3bff", fontSize: 24, fontWeight: 600 }}>
            {initials}
          </Avatar>
          
          <Box className={styles.profileInfo}>
            {/* Динамическое имя пользователя из AuthContext */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
              {user?.name || "Имя не указано"}
            </Typography>
            {/* Динамический Email из AuthContext */}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {/* {user?.email || "email@example.com"} */}
              {"email@example.com"}
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, bgcolor: "rgba(170, 59, 255, 0.1)", color: "#aa3bff", px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 600, alignSelf: "flex-start" }}>
              Роль: Пользователь
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3, borderColor: "#eef0f3" }} />

      {/* ================= СЕКЦИЯ 2: ВНЕШНИЙ ВИД ================= */}
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

      <Divider sx={{ my: 3, borderColor: "#eef0f3" }} />

      {/* ================= СЕКЦИЯ 3: УВЕДОМЛЕНИЯ ================= */}
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
            label={<Typography variant="body2">Получать отчёты и уведомления на почту email</Typography>}
          />
        </Stack>
      </Box>

      <Divider sx={{ my: 3, borderColor: "#eef0f3" }} />

      {/* ================= СЕКЦИЯ 4: БЕЗОПАСНОСТЬ ================= */}
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
          <TextField label="Новый пароль" type="password" size="small" fullWidth placeholder="••••••••" />
          <Button variant="outlined" color="primary" sx={{ textTransform: "none", fontWeight: 600, height: 40, width: 180, minWidth: 180 }}>
            Обновить пароль
          </Button>
        </Stack>
      </Box>    

      <Divider sx={{ my: 3, borderColor: "#eef0f3" }} />

      {/* ================= СЕКЦИЯ 5: ВЫХОД ИЗ СИСТЕМЫ ================= */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button 
          variant="text" 
          color="error" 
          startIcon={<LogoutOutlined />}
          sx={{ textTransform: "none", fontWeight: 600 }}
          onClick={() => console.log("Выход из системы")}
        >
          Выйти из аккаунта
        </Button>
      </Box>

    </Box>
  );
}

