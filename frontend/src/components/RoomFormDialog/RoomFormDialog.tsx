import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getErrorMessage, getErrorStatus } from "../../api/errors";
import {
  createRoom,
  updateRoom,
  type EquipmentDto,
  type RoomDto,
  type RoomPayload,
  type StatusRefDto,
} from "../../api/roomsApi";

interface StatusOption {
  code: string;
  name: string;
}

// Запасной список на случай, если справочник статусов не загрузился
const FALLBACK_STATUSES: StatusOption[] = [
  { code: "available", name: "Доступна" },
  { code: "booked", name: "Забронирована" },
  { code: "maintenance", name: "На обслуживании" },
];

interface RoomFormDialogProps {
  /** Аудитория для редактирования; без неё форма создаёт новую */
  room?: RoomDto;
  equipment: EquipmentDto[];
  statuses: StatusRefDto[];
  onClose: () => void;
  onSaved: (room: RoomDto, wasEdit: boolean) => void;
}

/** Форма создания и редактирования аудитории (POST /api/rooms, PUT /api/rooms/:id) — только для администратора. */
export function RoomFormDialog({ room, equipment, statuses, onClose, onSaved }: RoomFormDialogProps) {
  const isEdit = room !== undefined;

  const [code, setCode] = useState(room?.code ?? "");
  const [name, setName] = useState(room?.name ?? "");
  const [capacity, setCapacity] = useState(room ? String(room.capacity) : "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [status, setStatus] = useState<string>(room?.status ?? "available");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(room?.equipment ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions: StatusOption[] = statuses.length > 0 ? statuses : FALLBACK_STATUSES;

  const toggleEquipment = (equipmentCode: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipmentCode) ? prev.filter((item) => item !== equipmentCode) : [...prev, equipmentCode]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedCapacity = Number.parseInt(capacity, 10);
    if (code.trim() === "" || name.trim() === "") {
      setError("Укажите номер и название аудитории");
      return;
    }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError("Вместимость должна быть целым числом не меньше 1");
      return;
    }

    const payload: RoomPayload = {
      code: code.trim(),
      name: name.trim(),
      capacity: parsedCapacity,
      description: description.trim(),
      equipment: selectedEquipment,
      status,
    };

    setSubmitting(true);
    try {
      const saved = room ? await updateRoom(room.id, payload) : await createRoom(payload);
      onSaved(saved, isEdit);
    } catch (err) {
      setError(
        getErrorStatus(err) === 409
          ? "Аудитория с таким номером уже существует"
          : getErrorMessage(err, "Не удалось сохранить аудиторию")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? "Редактирование аудитории" : "Новая аудитория"}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Номер"
                size="small"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                sx={{ width: { sm: 160 } }}
              />
              <TextField
                label="Название"
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Вместимость"
                type="number"
                size="small"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                sx={{ width: { sm: 160 } }}
              />
              <TextField
                select
                label="Статус"
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.code} value={option.code}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Описание"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Оборудование
              </Typography>
              {equipment.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Справочник оборудования недоступен.
                </Typography>
              ) : (
                <FormGroup row>
                  {equipment.map((item) => (
                    <FormControlLabel
                      key={item.code}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedEquipment.includes(item.code)}
                          onChange={() => toggleEquipment(item.code)}
                        />
                      }
                      label={<Typography variant="body2">{item.name}</Typography>}
                    />
                  ))}
                </FormGroup>
              )}
            </div>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={onClose} color="inherit" variant="outlined" disabled={submitting} sx={{ textTransform: "none" }}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
