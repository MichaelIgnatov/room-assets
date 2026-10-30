import { useState } from 'react'
import { Header } from "./components/Header";
import { Container, Box } from "@mui/material";
import { RoomsTable } from './components/RoomsTable';
import { CatalogFilters } from './components/CatalogFilters/CatalogFilters';
import { Footer } from './components/Footer'; 
import { SettingsPage } from './components/SettingsPage';
import { BookingsManager } from './components/BookingsManager';
import { type CatalogFiltersState } from './api/roomsApi';

import './App.css'

// Начальное состояние для сброса фильтров
const initialFilters: CatalogFiltersState = {
  search: "",
  status: "all",
  capacity: "",
  selectedEquipment: [],
};

function App() {
  const [active, setActive] = useState("catalog");
  
  // Единый стейт фильтрации для каталога
  const [filters, setFilters] = useState<CatalogFiltersState>(initialFilters);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* Шапка сайта */}
      <Header
        activeNavId={active}
        onNavigate={setActive}    
        onBellClick={() => console.log("bell")}
      />

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          
          {/* Вкладка "Каталог" */}
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

          {/* Вкладка "Управление бронированием" */}
          {active === "bookings" && (
            <BookingsManager />
          )}

          {/* Вкладка "Настройки" */}
          {active === "settings" && (
            <SettingsPage />
          )}

        </Box>
      </Container>

      <Box sx={{ flexGrow: 1 }} />

      {/* Подвал сайта */}
      <Footer />
    </Box>
  )
}

export default App

