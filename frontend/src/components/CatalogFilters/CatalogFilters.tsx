import { Box, TextField, MenuItem, Button, Stack, Collapse, IconButton, Typography, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { TuneOutlined, RotateLeftOutlined, SearchOutlined } from "@mui/icons-material";
import { useState } from "react";
import { type CatalogFiltersState } from "../../api/roomsApi";
import styles from "./CatalogFilters.module.css";

interface CatalogFiltersProps {
  filters: CatalogFiltersState;
  onChange: (updater: (prev: CatalogFiltersState) => CatalogFiltersState) => void;
  onReset: () => void;
}

export function CatalogFilters({ filters, onChange, onReset }: CatalogFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFieldChange = (key: keyof CatalogFiltersState, value: any) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleEquipmentChange = (id: string) => {
    onChange((prev) => ({
      ...prev,
      selectedEquipment: prev.selectedEquipment.includes(id)
        ? prev.selectedEquipment.filter((item) => item !== id)
        : [...prev.selectedEquipment, id],
    }));
  };

  return (
    <Box className={styles.filtersContainer} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider", boxShadow: 1 }}>
      {/* ОСНОВНАЯ ПАНЕЛЬ ФИЛЬТРОВ */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center", width: "100%" }}>
        {/* Поле поиска */}
        <TextField
          label="Поиск аудитории"
          variant="outlined"
          size="small"
          value={filters.search}
          onChange={(e) => handleFieldChange("search", e.target.value)}
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
          value={filters.status}
          onChange={(e) => handleFieldChange("status", e.target.value)}
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
        <IconButton title="Сбросить все фильтры" onClick={onReset} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, height: 40, width: 40, bgcolor: "action.hover", flexShrink: 0 }}>
          <RotateLeftOutlined />
        </IconButton>
      </Stack>

      {/* РАСШИРЕННАЯ ПАНЕЛЬ */}
      <Collapse in={showAdvanced}>
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed", borderColor: "divider" }}>
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
                value={filters.capacity}
                onChange={(e) => handleFieldChange("capacity", e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>
                Требуемое оборудование
              </Typography>
              <FormGroup row>
                {[
                  { id: "projector", label: "Проектор" },
                  { id: "wifi", label: "Wi-Fi" },
                  { id: "microphone", label: "Микрофон" },
                  { id: "computers", label: "Компьютеры" },
                  { id: "board", label: "Доска" },
                ].map((equip) => (
                  <FormControlLabel
                    key={equip.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={filters.selectedEquipment.includes(equip.id)}
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
