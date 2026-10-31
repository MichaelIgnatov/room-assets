import React, { useEffect, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Box, IconButton, Stack, Typography, 
  Collapse, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  alpha
} from "@mui/material";
import { 
  VisibilityOutlined, EditOutlined, DeleteOutlined, 
  Groups2Outlined, AccessTimeOutlined 
} from "@mui/icons-material";
import { type CatalogFiltersState, type RoomDto } from "../../api/roomsApi";

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
  PROJECTOR: "Проектор", MICROPHONE: "Микрофон", WIFI: "Wi-Fi",
  COMPUTERS: "Компьютеры", BOARD: "Доска",
};

interface RoomsTableProps {
  filters: CatalogFiltersState;
}

export function RoomsTable({ filters }: RoomsTableProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<RoomDto[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomIdToDelete, setRoomIdToDelete] = useState<string | null>(null);
  
  const [currentSchedule, setCurrentSchedule] = useState<Array<{ from: string; to: string; title: string }>>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("rb:token");
      const response = await fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Не удалось загрузить каталог комнат");
      const data = await response.json();
      setItems(Array.isArray(data) ? data : data.rooms || []);
    } catch (e) {
      setError((e as Error).message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!expandedRoomId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingSchedule(true);
        const token = localStorage.getItem("rb:token");
        const response = await fetch(`/api/bookings?roomId=${expandedRoomId}&date=${scheduleDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok && mounted) {
          const data = await response.json();
          const bookings = Array.isArray(data) ? data : data.bookings || [];
          setCurrentSchedule(bookings.map((b: any) => ({
            from: b.startTime ? b.startTime.substring(11, 16) : "00:00",
            to: b.endTime ? b.endTime.substring(11, 16) : "23:59",
            title: b.title || `Бронь: ${b.user?.name || 'Пользователь'}`
          })));
        }
      } catch (err) {
        console.error("Ошибка загрузки расписания:", err);
      } finally {
        if (mounted) setLoadingSchedule(false);
      }
    })();
    return () => { mounted = false; };
  }, [expandedRoomId, scheduleDate]);

  const handleDeleteConfirm = async () => {
    if (!roomIdToDelete) return;
    try {
      const token = localStorage.getItem("rb:token");
      const response = await fetch(`/api/rooms/${roomIdToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== roomIdToDelete));
        setDeleteDialogOpen(false);
        setRoomIdToDelete(null);
      } else {
        const errData = await response.json();
        alert(errData.message || "Ошибка при удалении аудитории");
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось связаться с сервером");
    }
  };

  const filteredItems = items?.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "all" || r.status === filters.status;
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
          {filteredItems?.map((r) => {
            const isExpanded = expandedRoomId === r.id;

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
                        <Chip key={k} label={EQUIP_LABEL[k] ?? k} size="small" variant="outlined" sx={{ borderRadius: 1.5, bgcolor: "action.hover" }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Chip
                      label={STATUS_LABEL[r.status] || r.status}
                      size="small"
                      color={STATUS_COLOR[r.status] || "default"}
                      variant={r.status === "maintenance" ? "outlined" : "filled"}
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
                    <IconButton size="small" title="Редактировать"><EditOutlined fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" title="Удалить" onClick={() => {
                          setRoomIdToDelete(r.id);
                          setDeleteDialogOpen(true); }}>
                        <DeleteOutlined fontSize="small" />
                    </IconButton>
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
                            {loadingSchedule ? (
                              <CircularProgress size={20} />
                            ) : currentSchedule.length === 0 ? (
                              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
                                • В этот день аудитория полностью свободна для бронирования.
                              </Typography>
                            ) : (
                              <Stack spacing={1}>
                                {currentSchedule.map((slot, index) => (
                                  <Box 
                                    key={index} 
                                    sx={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      gap: 1.5, 
                                      bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12), 
                                      p: 1, 
                                      borderRadius: 1.5, 
                                      border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.35)}`, 
                                      maxWidth: 500 
                                    }}
                                  >
                                    <AccessTimeOutlined fontSize="small" sx={{ color: "warning.main" }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {slot.from} - {slot.to}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                      — {slot.title}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            )}
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
      
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <DialogContentText>Вы действительно хотите удалить эту аудиторию?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" variant="outlined">Отмена</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
