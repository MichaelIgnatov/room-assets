import { useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography, alpha } from "@mui/material";
import { AccessTimeOutlined } from "@mui/icons-material";
import { getErrorMessage } from "../../api/errors";
import { fetchRoomSchedule, type RoomStatus, type ScheduleSlotDto } from "../../api/roomsApi";

interface RoomScheduleProps {
  roomId: string;
  /** ГГГГ-ММ-ДД */
  date: string;
  status: RoomStatus;
}

/** Занятые промежутки аудитории на выбранную дату (GET /api/rooms/:id/schedule). */
export function RoomSchedule({ roomId, date, status }: RoomScheduleProps) {
  const [slots, setSlots] = useState<ScheduleSlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (date === "") {
      setSlots([]);
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRoomSchedule(roomId, date);
        if (active) setSlots(data);
      } catch (e) {
        if (active) setError(getErrorMessage(e, "Не удалось загрузить расписание"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [roomId, date]);

  const isMaintenance = status === "maintenance";

  if (loading) return <CircularProgress size={20} />;
  if (error) return <Typography variant="body2" color="error">{error}</Typography>;

  return (
    <Stack spacing={1}>
      {isMaintenance && (
        <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500 }}>
          • Аудитория на обслуживании и недоступна для бронирования.
        </Typography>
      )}

      {slots.length === 0 && !isMaintenance && (
        <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
          • В этот день аудитория полностью свободна для бронирования.
        </Typography>
      )}

      {slots.map((slot) => (
        <Box
          key={slot.bookingId}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: (theme) => alpha(isMaintenance ? theme.palette.error.main : theme.palette.warning.main, 0.12),
            p: 1,
            borderRadius: 1.5,
            border: (theme) =>
              `1px solid ${alpha(isMaintenance ? theme.palette.error.main : theme.palette.warning.main, 0.35)}`,
            maxWidth: 500,
          }}
        >
          <AccessTimeOutlined fontSize="small" sx={{ color: isMaintenance ? "error.main" : "warning.main" }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {slot.from} - {slot.to}
          </Typography>
          {slot.title && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              — {slot.title}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}
