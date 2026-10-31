import { useState } from 'react'
import { Header } from "./components/Header";
import { Container, Box, CircularProgress } from "@mui/material";
import { RoomsTable } from './components/RoomsTable';
import { CatalogFilters } from './components/CatalogFilters/CatalogFilters';
import { Footer } from './components/Footer'; 
import { SettingsPage } from './components/SettingsPage';
import { BookingsManager } from './components/BookingsManager';
import { type CatalogFiltersState } from './api/roomsApi';
import LoginPage from './components/LoginPage/LoginPage';
import { useAuth } from './context/auth';

import './App.css'

const initialFilters: CatalogFiltersState = {
  search: "",
  status: "all",
  capacity: "",
  selectedEquipment: [],
};

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [active, setActive] = useState("catalog");
  const [filters, setFilters] = useState<CatalogFiltersState>(initialFilters);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // 1. Если идёт проверка JWT-токена в localStorage — показываем загрузку
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // 2. Если токена нет или он невалиден — принудительно рендерим только страницу входа
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 3. Если пользователь авторизован — отдаём основное приложение
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Header
        activeNavId={active}
        onNavigate={setActive}    
        onBellClick={() => console.log("bell")}
      />

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          
          {active === "catalog" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <CatalogFilters 
                filters={filters} 
                onChange={setFilters} 
                onReset={handleResetFilters} 
              />
              <RoomsTable filters={filters} />
            </Box>
          )}

          {active === "bookings" && (
            <BookingsManager />
          )}

          {active === "settings" && (
            <SettingsPage />
          )}

        </Box>
      </Container>

      <Box sx={{ flexGrow: 1 }} />

      <Footer />
    </Box>
  )
}

export default App
