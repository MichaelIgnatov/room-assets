import { useState } from "react";
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Container } from "@mui/material";
import { useAuth } from "../../context/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleLoginClick = async () => {
    setError(null);
    setSubmitting(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
  
      if (response.ok && data.token) {
        await signIn(data.token);
      } else {
        setError(data.message || "Неверный логин или пароль");
      }
    } catch (err) {
      setError("Ошибка соединения с сервером.");
      console.error(err);
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
              Вход в систему
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

            <Box component="form" noValidate sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, py: 1.5, fontWeight: "bold" }}
                disabled={submitting}
                onClick={handleLoginClick}
                >
                {submitting ? "Вход..." : "Войти"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
