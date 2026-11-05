import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { VisibilityOffOutlined, VisibilityOutlined } from "@mui/icons-material";
import { useAuth } from "../../context/auth";
import { loginRequest, registerRequest } from "../../api/authApi";
import { getErrorMessage } from "../../api/errors";

type Mode = "login" | "register";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isLogin = mode === "login";

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setError(null);
  };

  // Вход: POST /api/auth/login -> JWT в localStorage -> GET /api/auth/me (всё это делает signIn)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    setSubmitting(true);
    try {
      const trimmedName = name.trim();
      const { token } = isLogin
        ? await loginRequest(email.trim(), password)
        : await registerRequest({
            email: email.trim(),
            password,
            ...(trimmedName !== "" ? { name: trimmedName } : {}),
          });
      await signIn(token);
      // После успеха App сам заменит этот экран на основной интерфейс
    } catch (err) {
      setError(getErrorMessage(err, isLogin ? "Не удалось войти" : "Не удалось зарегистрироваться"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card sx={{ width: "100%", borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: "bold" }}>
              {isLogin ? "Вход в систему" : "Регистрация"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Room & Assets Management
            </Typography>

            {/* Вывод ошибки при неверном вводе */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              {!isLogin && (
                <TextField
                  margin="normal"
                  fullWidth
                  label="Имя (необязательно)"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Пароль"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                helperText={isLogin ? undefined : "Не короче 6 символов"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, py: 1.5, fontWeight: "bold" }}
                disabled={submitting || email.trim() === "" || password === ""}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {submitting ? (isLogin ? "Вход..." : "Регистрация...") : isLogin ? "Войти" : "Зарегистрироваться"}
              </Button>
              <Button
                type="button"
                fullWidth
                variant="text"
                sx={{ mt: 1, textTransform: "none" }}
                disabled={submitting}
                onClick={switchMode}
              >
                {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
