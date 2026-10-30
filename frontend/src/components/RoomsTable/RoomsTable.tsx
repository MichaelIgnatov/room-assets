import React, { useEffect, useState } from "react";
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Box, IconButton, Stack, Typography, 
  Collapse, TextField,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button 
} from "@mui/material";
import { 
  VisibilityOutlined, EditOutlined, DeleteOutlined, 
  Groups2Outlined, AccessTimeOutlined 
} from "@mui/icons-material";
import { type CatalogFiltersState, fetchRooms, type RoomDto } from "../../api/roomsApi";

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

const ROOMS_SCHEDULE: Record<string, Array<{ from: string; to: string; title: string }>> = {
  "201": [
    { from: "09:00", to: "11:00", title: "Защита проектов" },
    { from: "14:00", to: "16:00", title: "Собрание кафедры" }
  ],
  "101": [
    { from: "12:00", to: "13:30", title: "Лекция по ИС" }
  ],
  "102": [
    { from: "08:00", to: "12:00", title: "Лабораторная" },
    { from: "13:00", to: "17:00", title: "Олимпиада" }
  ],
  "202": [
    { from: "00:00", to: "23:59", title: "Тех-обслуживание" }
  ],
};

interface RoomsTableProps {
  filters: CatalogFiltersState;
}


export function RoomsTable({ filters }: RoomsTableProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<RoomDto[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("2026-10-25");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomIdToDelete, setRoomIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchRooms(1);
        if (mounted) setItems(data.items);
      } catch (e) {
        if (mounted) setError((e as Error).message || "Ошибка загрузки");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredItems = items?.filter((r) => {
    // 1. Поиск по коду или названию
    const matchesSearch =
      r.code.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.name.toLowerCase().includes(filters.search.toLowerCase());
    // 2. Фильтр по статусу
    const matchesStatus = filters.status === "all" || r.status === filters.status;
    // 3. Фильтр по минимальной вместимости
    const matchesCapacity =
      !filters.capacity || r.capacity >= parseInt(filters.capacity, 10);
    // 4. Фильтр по галочкам оборудования
    const matchesEquipment = filters.selectedEquipment.every((equipId) =>
      r.equipment?.includes(equipId)
    );
    return matchesSearch && matchesStatus && matchesCapacity && matchesEquipment;
  });

  const handleDeleteConfirm = () => {
    if (roomIdToDelete) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== roomIdToDelete));
      setDeleteDialogOpen(false);
      setRoomIdToDelete(null);
    }
  };
  

  if (loading) return <Box sx={{ p: 3, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (error)   return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;

  

  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #eef0f3" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#fafafa" }}>
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
            const currentSchedule = ROOMS_SCHEDULE[r.code] || [];

            return (
              <React.Fragment key={r.id}>
                <TableRow hover>
                  <TableCell sx={{ py: 2, color: "text.secondary", verticalAlign: "middle" }}>{r.code}</TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Typography sx={{ fontWeight: 600, color: "#1a1a1a" }}>{r.name}</Typography>
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
                        <Chip key={k} label={EQUIP_LABEL[k] ?? k} size="small" variant="outlined" sx={{ borderRadius: 1.5, bgcolor: "#fafafa" }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Chip
                      label={STATUS_LABEL[r.status]}
                      size="small"
                      color={STATUS_COLOR[r.status]}
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

                <TableRow sx={{ bgcolor: "#fcfdfe" }}>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2, p: 2, border: "1px dashed #e5e4e7", borderRadius: 2, bgcolor: "#ffffff" }}>
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
                            {currentSchedule.length === 0 ? (
                              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
                                • В этот день аудитория полностью свободна для бронирования.
                              </Typography>
                            ) : (
                              <Stack spacing={1}>
                                {currentSchedule?.map((slot, index) => (
                                  <Box 
                                    key={index} 
                                    sx={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      gap: 1.5, 
                                      bgcolor: r.status === "maintenance" ? "#fff5f5" : "#fff9e6", 
                                      p: 1, 
                                      borderRadius: 1.5, 
                                      border: r.status === "maintenance" ? "1px solid #ffe3e3" : "1px solid #ffeaa7", 
                                      maxWidth: 500 
                                    }}
                                  >
                                    <AccessTimeOutlined fontSize="small" sx={{ color: r.status === "maintenance" ? "error.main" : "warning.main" }} />
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
      {/* Всплывающее окно подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 600 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Вы действительно хотите удалить эту аудиторию?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" variant="outlined">
            Отмена
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
