import { 
  Box, Typography, Button, 
  Paper, Table, TableHead, 
  TableRow, TableCell, 
  TableBody, IconButton, 
  Chip, Modal, TextField, 
  MenuItem, Stack, 
  TablePagination, CircularProgress,
  Alert, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from "@mui/material";
import { 
  DeleteOutlined, 
  AddCircleOutlined, 
  CalendarTodayOutlined, 
  AccessTimeOutlined, 
  SearchOutlined,
  RotateLeftOutlined
} from "@mui/icons-material";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/auth";
import styles from "./BookingsManager.module.css";
import {
  cancelBooking,
  createBooking,
  fetchBookings,
  type BookingDto,
  type BookingsFilter,
} from "../../api/bookingsApi";
import { fetchRooms, type RoomDto } from "../../api/roomsApi";
import { fetchUsers, type UserDto } from "../../api/usersApi";
import { getErrorMessage, getErrorStatus } from "../../api/errors";

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждено",
  rejected: "Отклонено",
  cancelled: "Отменено",
  completed: "Завершено",
};

const STATUS_COLOR: Record<string, ChipColor> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
  cancelled: "default",
  completed: "info",
};

const CANCELLABLE_STATUSES = ["pending", "confirmed"];
const HIDDEN_BY_DEFAULT = ["cancelled", "rejected"];

interface Notice {
  severity: "success" | "error";
  text: string;
}

export function BookingsManager() {
  const { isAdmin } = useAuth();
  
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [usersList, setUsersList] = useState<UserDto[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openModal, setOpenModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formRoomCode, setFormRoomCode] = useState("");
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [purpose, setPurpose] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [bookingToCancel, setBookingToCancel] = useState<BookingDto | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        let filter: BookingsFilter | undefined;
        if (isAdmin) filter = adminSelectedUserId === "all" ? { all: true } : { userId: adminSelectedUserId };

        const data = await fetchBookings(filter);
        if (!active) return;
        setBookings(data);
        setLoadError(null);
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err, "Не удалось получить список бронирований с сервера"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAdmin, adminSelectedUserId, reloadKey]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const roomsData = await fetchRooms(1);
        if (active) setRooms(roomsData.items);
      } catch (err) {
        console.error("Ошибка загрузки аудиторий для формы:", err);
      }

      if (!isAdmin) return;
      try {
        const usersData = await fetchUsers();
        if (active) setUsersList(usersData);
      } catch (err) {
        console.error("Ошибка загрузки списка пользователей:", err);
      }
    })();
    return () => { active = false; };
  }, [isAdmin]);

  const bookableRooms = useMemo(() => rooms.filter((r) => r.status !== "maintenance"), [rooms]);

  const resetForm = () => {
    setFormRoomCode(""); setDate(""); setTimeStart(""); setTimeEnd(""); setPurpose(""); setFormUserId("");
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setOpenModal(true);
  };

  const closeCreateModal = () => {
    if (!submitting) setOpenModal(false);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    const target = bookingToCancel;

    setCancelling(true);
    try {
      await cancelBooking(target.id);
      setBookings((prev) => prev.map((b) => (b.id === target.id ? { ...b, status: "cancelled" } : b)));
      setNotice({ severity: "success", text: "Бронирование отменено" });
    } catch (err) {
      setNotice({ severity: "error", text: getErrorMessage(err, "Не удалось отменить бронирование") });
    } finally {
      setCancelling(false);
      setBookingToCancel(null);
    }
  };

  const handleCreateBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRoomCode || !date || !timeStart || !timeEnd || !purpose.trim()) return;

    setFormError(null);

    // ВАЛИДАЦИЯ ПРОШЛОГО ВРЕМЕНИ И ДАТЫ
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10); // ГГГГ-ММ-ДД
    const currentHoursMinutes = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (date < todayStr) {
      setFormError("Нельзя забронировать аудиторию на прошедшую дату");
      return;
    }

    if (date === todayStr && timeStart < currentHoursMinutes) {
      setFormError("Время начала бронирования уже прошло");
      return;
    }

    if (timeEnd <= timeStart) {
      setFormError("Время окончания должно быть позже времени начала");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        roomCode: formRoomCode,
        date,
        timeStart,
        timeEnd,
        purpose: purpose.trim(),
        ...(isAdmin && formUserId !== "" ? { userId: formUserId } : {}),
      });

      setOpenModal(false);
      resetForm();
      setPage(0);
      setReloadKey((k) => k + 1);
      setNotice({ severity: "success", text: "Бронирование успешно создано!" });
    } catch (err) {
      setFormError(
        getErrorStatus(err) === 409
          ? getErrorMessage(err, "Данное время в этой аудитории уже занято!")
          : getErrorMessage(err, "Не удалось сохранить бронирование")
      );
    } finally {
      setSubmitting(false);
    }
  };


  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const query = searchQuery.toLowerCase();
        const mSearch = b.roomCode.includes(searchQuery) || b.roomName.toLowerCase().includes(query);
        const mDate = filterDate === "" || b.date === filterDate;
        const mStatus = showCancelled || !HIDDEN_BY_DEFAULT.includes(b.status);
        return mSearch && mDate && mStatus;
      }),
    [bookings, searchQuery, filterDate, showCancelled]
  );

  const paginatedBookings = filteredBookings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatDateToRU = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.substring(0, 10).split("-");
    return (year && month && day) ? `${day}.${month}.${year}` : dateStr;
  };

  return (
    <Box className={styles.bookingsContainer}>
      
      <Box className={styles.topPanel} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider", boxShadow: 1, p: 2.5, borderRadius: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ fontWeight: 700, color: "text.primary", textAlign: "left", mb: 2 }}
        >
          {isAdmin ? "Менеджер бронирований" : "Мои текущие бронирования"}
        </Typography>

        <Stack spacing={2} component="div">
          {/* Поисковые фильтры, переключатель и кнопка сброса */}
          <Stack direction="row" spacing={2} component="div" sx={{ alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <TextField
              label="Поиск по аудитории"
              variant="outlined"
              size="small"
              className={styles.searchField}
              value={searchQuery}
              onChange={(e) => { 
                setSearchQuery(e.target.value); 
                setPage(0); 
              }}
              slotProps={{
                input: {
                  startAdornment: <SearchOutlined 
                    fontSize="small" 
                    sx={{ mr: 1, color: "text.secondary" }} 
                  />,
                },
              }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            
            <TextField
              type="date"
              size="small"
              label="Фильтр по дате"
              className={styles.dateField}
              value={filterDate}
              onChange={(e) => { 
                setFilterDate(e.target.value); 
                setPage(0); 
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showCancelled}
                  onChange={(e) => { setShowCancelled(e.target.checked); setPage(0); }}
                />
              }
              label={<Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>Показывать отменённые</Typography>}
            />

            <IconButton 
              title="Сбросить фильтры" 
              onClick={() => {
                setSearchQuery("");
                setFilterDate("");
                setShowCancelled(false);
                setAdminSelectedUserId("all");
                setPage(0);
              }} 
              sx={{ 
                border: 1,
                borderColor: "divider",
                borderRadius: 1.5, 
                height: 40, 
                width: 40, 
                bgcolor: "action.hover",
                flexShrink: 0
              }}
            >
              <RotateLeftOutlined />
            </IconButton>
          </Stack>

          {/* Выбор пользователя слева + кнопка Новое бронирование справа */}
          <Stack direction="row" component="div" sx={{ justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <Box component="div">
              {isAdmin && (
                <TextField
                  select
                  size="small"
                  label="Пользователь"
                  value={adminSelectedUserId}
                  onChange={(e) => {
                    setAdminSelectedUserId(e.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value="all">Все пользователи</MenuItem>
                  {usersList.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name || "Без имени"} ({u.email})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddCircleOutlined />}
              onClick={openCreateModal}
              className={styles.createButton}
              sx={{ fontWeight: 600, textTransform: "none", height: 40, px: 3 }}
            >
              Новое бронирование
            </Button>
          </Stack>
        </Stack>
      </Box>
      {notice && (
        <Alert severity={notice.severity} onClose={() => setNotice(null)} sx={{ mt: 2 }}>
          {notice.text}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider", mt: 3 }}>
        {loading ? (
          <Box sx={{ p: 4, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell width={120} sx={{ py: 2, fontWeight: 600 }}>Ауд.</TableCell>
                <TableCell sx={{ py: 2, fontWeight: 600 }}>Цель / Ресурс</TableCell>
                <TableCell width={160} sx={{ py: 2, fontWeight: 600 }}>Дата</TableCell>
                <TableCell width={160} sx={{ py: 2, fontWeight: 600 }}>Время</TableCell>
                <TableCell width={180} sx={{ py: 2, fontWeight: 600 }}>Статус / Автор</TableCell>
                <TableCell width={100} align="center" sx={{ py: 2, fontWeight: 600 }}>Действие</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadError ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "error.main" }}>
                    {loadError}
                  </TableCell>
                </TableRow>
              ) : paginatedBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {isAdmin ? "Бронирований не найдено." : "У вас пока нет активных бронирований аудиторий."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBookings.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ py: 2, fontWeight: 600, verticalAlign: "middle" }}>
                      № {b.roomCode}
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.purpose || "Без цели"}</Typography>
                      <Typography variant="caption" color="text.secondary">{b.roomName}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <CalendarTodayOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2">{formatDateToRU(b.date)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <AccessTimeOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="body2">
                          {b.timeStart} - {b.timeEnd}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                      <Stack spacing={0.5}>
                        <Chip 
                          label={STATUS_LABEL[b.status] ?? b.status} 
                          size="small" 
                          color={STATUS_COLOR[b.status] ?? "default"} 
                          variant="outlined" 
                          sx={{ borderRadius: 1.5, alignSelf: "flex-start" }} 
                        />
                        <Typography variant="caption" color="text.secondary">
                          От: {b.userName || b.userEmail || "Пользователь"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2, verticalAlign: "middle" }}>
                      {CANCELLABLE_STATUSES.includes(b.status) && (
                        <IconButton size="small" color="error" onClick={() => setBookingToCancel(b)} title="Отменить бронирование">
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <TablePagination
          rowsPerPageOptions={[10, 25]}
          component="div"
          count={filteredBookings.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { 
            setPage(0); 
            setRowsPerPage(parseInt(e.target.value, 10)); 
          }}
          labelRowsPerPage="Строк:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        />
      </Paper>

      <Modal open={openModal} onClose={closeCreateModal}>
        <Paper 
          className={styles.modalPaper} 
          sx={{ 
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)", 
            bgcolor: "background.paper", 
            color: "text.primary", 
            border: 1, 
            borderColor: "divider", 
            boxShadow: 24, 
            p: 4, 
            width: "100%",
            maxWidth: 450,
            borderRadius: 3
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: "left" }}>
            Новое бронирование
          </Typography>
          <Box component="form" onSubmit={handleCreateBooking} className={styles.modalForm} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            
            {isAdmin && (
              <TextField 
                select 
                label="Забронировать для" 
                size="small" 
                fullWidth 
                value={formUserId} 
                onChange={(e) => setFormUserId(e.target.value)}
                helperText="Оставьте пустым, чтобы забронировать для себя"
              >
                <MenuItem value="">Себя (Администратор)</MenuItem>
                {usersList.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name || "Без имени"} ({u.email})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField 
              select 
              label="Аудитория" 
              size="small" 
              fullWidth 
              value={formRoomCode} 
              onChange={(e) => setFormRoomCode(e.target.value)} 
              required
            >
              {bookableRooms.map((r) => (
                <MenuItem key={r.id} value={r.code}>
                  Аудитория {r.code} ({r.name})
                </MenuItem>
              ))}
            </TextField>

            <TextField 
              label="Цель бронирования" 
              size="small" 
              fullWidth 
              placeholder="Например, Лабораторная работа"
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              required 
            />
            
            <TextField type="date" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Дата" value={date} onChange={(e) => setDate(e.target.value)} required />
            
            <Stack direction="row" spacing={2}>
              <TextField type="time" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Начало" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
              <TextField type="time" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Конец" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end", mt: 1 }}>
              <Button variant="outlined" color="inherit" onClick={closeCreateModal} disabled={submitting} sx={{ textTransform: "none" }}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                sx={{ textTransform: "none" }}
              >
                Подтвердить
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Modal>

      <Dialog open={bookingToCancel !== null} onClose={cancelling ? undefined : () => setBookingToCancel(null)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Отмена бронирования</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bookingToCancel
              ? `Отменить бронирование аудитории ${bookingToCancel.roomCode} на ${formatDateToRU(bookingToCancel.date)}, ${bookingToCancel.timeStart} - ${bookingToCancel.timeEnd}?`
              : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setBookingToCancel(null)} color="inherit" variant="outlined" disabled={cancelling}>
            Назад
          </Button>
          <Button
            onClick={() => void handleConfirmCancel()}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={18} color="inherit" /> : undefined}
            autoFocus
          >
            Отменить бронь
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
