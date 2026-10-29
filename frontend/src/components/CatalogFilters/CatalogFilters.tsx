import { Box, TextField, MenuItem, Button, Stack, Collapse, IconButton, Typography, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { TuneOutlined, RotateLeftOutlined, SearchOutlined } from "@mui/icons-material";
import { useState } from "react";
import styles from "./CatalogFilters.module.css";

const AVAILABLE_EQUIPMENT = [
  { id: "projector", label: "Проектор" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "microphone", label: "Микрофон" },
  { id: "computers", label: "Компьютеры" },
  { id: "board", label: "Доска" },
];

export function CatalogFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const handleEquipmentChange = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setSearch("");
    setStatus("all");
    setCapacity("");
    setSelectedEquipment([]);
  };

  return (
    <Box className={styles.filtersContainer}>
      
      {/* ОСНОВНАЯ ПАНЕЛЬ ФИЛЬТРОВ */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center", width: "100%" }}>
        
        {/* Поле поиска */}
        <TextField
          label="Поиск аудитории"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Введите название или номер..."
          sx={{ flexGrow: 1, width: "100%" }} 
          slotProps={{
            input: {
              startAdornment: <SearchOutlined fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
            },
          }}
        />

        {/* Выпадающий список */}
        <TextField
          select
          label="Статус"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          sx={{ width: 200, minWidth: 200, flexShrink: 0 }}
        >
          <MenuItem value="all">Все статусы</MenuItem>
          <MenuItem value="available">Доступна</MenuItem>
          <MenuItem value="booked">Забронирована</MenuItem>
          <MenuItem value="maintenance">На обслуживании</MenuItem>
        </TextField>

        {/* Кнопка фильтров */}
        <Button 
          variant={showAdvanced ? "contained" : "outlined"} 
          color="primary"
          size="medium"
          startIcon={<TuneOutlined />}
          onClick={() => setShowAdvanced(!showAdvanced)}
          sx={{ height: 40, width: 140, minWidth: 140, flexShrink: 0, whiteSpace: "nowrap", fontWeight: 600 }}
        >
          Фильтры
        </Button>

        {/* Кнопка сброса */}
        <IconButton title="Сбросить все фильтры" onClick={handleReset} sx={{ border: "1px solid #eef0f3", borderRadius: 1.5, height: 40, width: 40, bgcolor: "#fafafa", flexShrink: 0 }}>
          <RotateLeftOutlined />
        </IconButton>
      </Stack>

      {/* РАСШИРЕННАЯ ПАНЕЛЬ */}
      <Collapse in={showAdvanced}>
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed #eef0f3" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
            
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}>
                Минимальная вместимость
              </Typography>
              <TextField
                type="number"
                placeholder="Например, 20"
                size="small"
                fullWidth
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>
                Требуемое оборудование
              </Typography>
              <FormGroup row>
                {AVAILABLE_EQUIPMENT?.map((equip) => (
                  <FormControlLabel
                    key={equip.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedEquipment.includes(equip.id)}
                        onChange={() => handleEquipmentChange(equip.id)}
                      />
                    }
                    label={equip.label}
                    sx={{ mr: 3 }}
                  />
                ))}
              </FormGroup>
            </Box>

          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
