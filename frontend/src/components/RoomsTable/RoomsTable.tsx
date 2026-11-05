import React, { useEffect, useMemo, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Box, IconButton, Stack, Typography, 
  Collapse, TextField, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from "@mui/material";
import { 
  VisibilityOutlined, EditOutlined, DeleteOutlined, 
  Groups2Outlined, AddCircleOutlined
} from "@mui/icons-material";
import {
  type CatalogFiltersState, type EquipmentDto, type RoomDto, type StatusRefDto,
  deleteRoom, fetchEquipment, fetchRoomStatuses, fetchRooms,
} from "../../api/roomsApi";
import { getErrorMessage } from "../../api/errors";
import { useAuth } from "../../context/auth";
import { RoomFormDialog } from "../RoomFormDialog";
import { RoomSchedule } from "./RoomSchedule";

const STATUS_LABEL: Record<RoomDto["status"], string> = {
  available: "Доступна",
  booked: "Забронирована",
  maintenance: "На обслуживании",
};

const STATUS_COLOR: Record<RoomDto["status"], "success" | "warning" | "default"> = {
  available: "success",
  booked: "warning",
  maintenance: "default",
};

const EQUIP_LABEL: Record<string, string> = {
  projector: "Проектор", microphone: "Микрофон", wifi: "Wi-Fi",
  computers: "Компьютеры", board: "Доска",
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface RoomsTableProps {
  filters: CatalogFiltersState;
}

export function RoomsTable({ filters }: RoomsTableProps) {
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<RoomDto[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayIso);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomIdToDelete, setRoomIdToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formState, setFormState] = useState<{ room?: RoomDto } | null>(null);
  const [equipment, setEquipment] = useState<EquipmentDto[]>([]);
  const [statuses, setStatuses] = useState<StatusRefDto[]>([]);

  const [allTodayBookings, setAllTodayBookings] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchRooms(1);
        if (mounted) setItems(data.items);
      } catch (e) {
        if (mounted) setError(getErrorMessage(e, "Не удалось загрузить каталог комнат"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem("rb:token");
        const response = await fetch(`/api/bookings?all=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok && mounted) {
          const resData = await response.json();
          setAllTodayBookings(Array.isArray(resData) ? resData : []);
        }
      } catch (err) {
        console.error("Ошибка обновления статусов:", err);
      }
    })();
    return () => { mounted = false; };
  }, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [equipmentResult, statusesResult] = await Promise.allSettled([fetchEquipment(), fetchRoomStatuses()]);
      if (!mounted) return;
      if (equipmentResult.status === "fulfilled") setEquipment(equipmentResult.value);
      if (statusesResult.status === "fulfilled") setStatuses(statusesResult.value);
    })();
    return () => { mounted = false; };
  }, []);

  const equipmentNames = useMemo(
    () => new Map<string, string>(equipment.map((item): [string, string] => [item.code, item.name])),
    [equipment]
  );

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRoomIdToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!roomIdToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteRoom(roomIdToDelete);
      setItems((prev) => prev.filter((item) => item.id !== roomIdToDelete));
      if (expandedRoomId === roomIdToDelete) setExpandedRoomId(null);
    } catch (e) {
      setActionError(getErrorMessage(e, "Ошибка при удалении аудитории"));
    } finally {
      setDeleting(false);
      closeDeleteDialog();
    }
  };

  const handleSaved = (saved: RoomDto, wasEdit: boolean) => {
    setItems((prev) => (wasEdit ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]));
    setFormState(null);
  };

  const getDynamicStatus = (room: RoomDto): RoomDto["status"] => {
    if (room.status === "maintenance") return "maintenance";
    const nowIsoDate = todayIso();
    const currentHours = String(currentTime.getHours()).padStart(2, "0");
    const currentMinutes = String(currentTime.getMinutes()).padStart(2, "0");
    const nowTimeStr = `${currentHours}:${currentMinutes}`;

    const isNowBooked = allTodayBookings.some((b) => {
      if (b.roomCode !== room.code || b.date !== nowIsoDate) return false;
      return nowTimeStr >= b.timeStart && nowTimeStr <= b.timeEnd && b.status !== "cancelled" && b.status !== "rejected";
    });
    return isNowBooked ? "booked" : "available";
  };

  const filteredItems = items.filter((r) => {
    const dynamicStatus = getDynamicStatus(r);
    const matchesSearch =
      r.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "all" || dynamicStatus === filters.status;
    const matchesCapacity = !filters.capacity || r.capacity >= parseInt(filters.capacity, 10);
    const matchesEquipment = filters.selectedEquipment.every((equipId) =>
      r.equipment?.includes(equipId)
    );
    return matchesSearch && matchesStatus && matchesCapacity && matchesEquipment;
  });

  if (loading) return <Box sx={{ p: 3, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (error)   return <Box sx={{ p: 3, textAlign: "center" }}><Typography color="error">{error}</Typography></Box>;
  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ borderRadius: 0 }}>
          {actionError}
        </Alert>
      )}

      {isAdmin && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, py: 1.5 }}>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlined />}
            onClick={() => setFormState({})}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Добавить аудиторию
          </Button>
        </Box>
      )}

      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell width={100} sx={{ py: 2, fontWeight: 600 }}>Номер</TableCell>
            <TableCell sx={{ py: 2, fontWeight: 600 }}>Название</TableCell>
            <TableCell width={160} align="right" sx={{ py: 2, fontWeight: 600 }}>Вместимость</TableCell>
            <TableCell sx={{ py: 2, fontWeight: 600 }}>Оборудование</TableCell>
            <TableCell width={170} sx={{ py: 2, fontWeight: 600 }}>Статус</TableCell>
            <TableCell width={120} align="center" sx={{ py: 2, fontWeight: 600 }}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                Ничего не найдено
              </TableCell>
            </TableRow>
          )}
          {filteredItems.map((r) => {
            const isExpanded = expandedRoomId === r.id;
            const currentStatus = getDynamicStatus(r);

            return (
              <React.Fragment key={r.id}>
                <TableRow hover>
                  <TableCell sx={{ py: 2, color: "text.secondary", verticalAlign: "middle" }}>{r.code}</TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Typography sx={{ fontWeight: 600, color: "text.primary" }}>{r.name}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2, verticalAlign: "middle" }}>
                    <Stack component="div" direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                      <Groups2Outlined fontSize="small" sx={{ color: "text.secondary" }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.capacity}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Stack component="div" direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", maxWidth: 350 }}>
                      {r.equipment?.map((k) => (
                        <Chip key={k} label={equipmentNames.get(k) ?? EQUIP_LABEL[k] ?? k} size="small" variant="outlined" sx={{ borderRadius: 1.5, bgcolor: "action.hover" }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Chip
                      label={STATUS_LABEL[currentStatus] || currentStatus}
                      size="small"
                      color={STATUS_COLOR[currentStatus] || "default"}
                      variant={currentStatus === "maintenance" ? "outlined" : "filled"}
                      sx={{ fontWeight: 500, borderRadius: 1.5 }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ py: 2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                    <IconButton 
                      size="small" 
                      title="Просмотр расписания" 
                      color={isExpanded ? "primary" : "default"} 
                      onClick={() => setExpandedRoomId(isExpanded ? null : r.id)}
                    >
                      <VisibilityOutlined fontSize="small" />
                    </IconButton>
                    {isAdmin && (
                      <>
                        <IconButton size="small" title="Редактировать" onClick={() => setFormState({ room: r })}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Удалить" onClick={() => {
                          setRoomIdToDelete(r.id);
                          setDeleteDialogOpen(true); }}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>

                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
                          <Box sx={{ minWidth: 180 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, textAlign: "left" }}>
                              Расписание на дату:
                            </Typography>
                            <TextField 
                              type="date" 
                              size="small" 
                              fullWidth 
                              value={scheduleDate} 
                              onChange={(e) => setScheduleDate(e.target.value)} 
                            />
                          </Box>
                          <Box sx={{ flexGrow: 1, width: "100%", textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                              Занятые промежутки времени:
                            </Typography>
                            <RoomSchedule roomId={r.id} date={scheduleDate} status={currentStatus} />
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      
      <Dialog open={deleteDialogOpen} onClose={deleting ? undefined : closeDeleteDialog}>
        <DialogTitle sx={{ fontWeight: 600 }}>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы действительно хотите удалить эту аудиторию? Все её бронирования также будут удалены.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={closeDeleteDialog} color="inherit" variant="outlined" disabled={deleting}>Отмена</Button>
          <Button
            onClick={() => void handleDeleteConfirm()}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : undefined}
            autoFocus
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {isAdmin && formState !== null && (
        <RoomFormDialog
          key={formState.room?.id ?? "new"}
          room={formState.room}
          equipment={equipment}
          statuses={statuses}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      )}
    </Paper>
  );
}
