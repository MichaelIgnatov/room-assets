import { 
  Box, Typography, Button, 
  Paper, Table, TableHead, 
  TableRow, TableCell, 
  TableBody, IconButton, 
  Chip, Modal, TextField, 
  MenuItem, Stack, 
  TablePagination 
} from "@mui/material";
import { 
  DeleteOutlined, 
  AddCircleOutlined, 
  CalendarTodayOutlined, 
  AccessTimeOutlined, 
  SearchOutlined,
  RotateLeftOutlined
} from "@mui/icons-material";
import { useState } from "react";
import styles from "./BookingsManager.module.css";

const INITIAL_BOOKINGS = [
  { id: "b1", roomCode: "101", roomName: "Конференц-зал", date: "2026-10-25", time: "10:00 - 12:00" },
  { id: "b2", roomCode: "204", roomName: "Лекционная", date: "2026-10-26", time: "14:00 - 15:30" },
  { id: "b3", roomCode: "102", roomName: "Компьютерный класс", date: "2026-10-27", time: "09:00 - 10:30" },
  { id: "b4", roomCode: "101", roomName: "Конференц-зал", date: "2026-10-28", time: "16:00 - 18:00" },
  { id: "b5", roomCode: "202", roomName: "Переговорная малая", date: "2026-10-29", time: "11:00 - 12:00" },
  { id: "b6", roomCode: "204", roomName: "Лекционная", date: "2026-10-30", time: "13:00 - 14:30" },
];
export function BookingsManager() {
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [openModal, setOpenModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [room, setRoom] = useState("");
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");

  const handleCancelBooking = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !date || !timeStart || !timeEnd) return;

    const newBooking = {
      id: "b_" + Date.now(),
      roomCode: room === "101" ? "101" : "204",
      roomName: room === "101" ? "Конференц-зал" : "Лекционная",
      date: date,
      time: `${timeStart} - ${timeEnd}`,
    };

    setBookings((prev) => [newBooking, ...prev]);
    setOpenModal(false);
    setPage(0);
    setRoom(""); setDate(""); setTimeStart(""); setTimeEnd("");
  };

  const filteredBookings = bookings.filter((b) => {
    const mSearch = 
      b.roomCode.includes(searchQuery) || 
      b.roomName.toLowerCase().includes(
        searchQuery.toLowerCase()
      );
    const mDate = filterDate === "" || b.date === filterDate;
    return mSearch && mDate;
  });

  const paginatedBookings = filteredBookings.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDateToRU = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr; 
    return `${day}.${month}.${year}`;
  };

  return (
    <Box className={styles.bookingsContainer}>
      
      <Box className={styles.topPanel} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider", boxShadow: 1 }}>
        <Typography 
          variant="h6" 
          sx={{ fontWeight: 700, color: "text.primary", textAlign: "left" }}
        >
          Мои текущие бронирования
        </Typography>

        <Box className={styles.filterRow}>
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
          />

          <IconButton 
            title="Сбросить фильтры" 
            onClick={() => {
              setSearchQuery("");
              setFilterDate("");
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

          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddCircleOutlined />}
            onClick={() => setOpenModal(true)}
            className={styles.createButton}
            sx={{ fontWeight: 600, textTransform: "none" }}
          >
            Новое бронирование
          </Button>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell width={120} sx={{ py: 2, fontWeight: 600 }}>Ауд.</TableCell>
              <TableCell sx={{ py: 2, fontWeight: 600 }}>Ресурс</TableCell>
              <TableCell width={160} sx={{ py: 2, fontWeight: 600 }}>Дата</TableCell>
              <TableCell width={160} sx={{ py: 2, fontWeight: 600 }}>Время</TableCell>
              <TableCell width={150} sx={{ py: 2, fontWeight: 600 }}>Статус</TableCell>
              <TableCell width={100} align="center" sx={{ py: 2, fontWeight: 600 }}>Действие</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Ничего не найдено
                </TableCell>
              </TableRow>
            ) : (
              paginatedBookings?.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ py: 2, fontWeight: 600, verticalAlign: "middle" }}>
                    № {b.roomCode}
                  </TableCell>
                  <TableCell sx={{ py: 2, fontWeight: 500, verticalAlign: "middle" }}>
                    {b.roomName}
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
                      <Typography variant="body2">{b.time}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: "middle" }}>
                    <Chip label="Подтверждено" size="small" color="success" variant="outlined" sx={{ borderRadius: 1.5 }} />
                  </TableCell>
                  <TableCell align="center" sx={{ py: 2, verticalAlign: "middle" }}>
                    <IconButton size="small" color="error" onClick={() => handleCancelBooking(b.id)}>
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 25]}
          component="div"
          count={filteredBookings.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { 
            setRowsPerPage(parseInt(e.target.value, 10)); 
            setPage(0); 
          }}
          labelRowsPerPage="Строк:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        />
      </Paper>

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Paper className={styles.modalPaper} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider", boxShadow: 8 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Новое бронирование
          </Typography>
          <Box component="form" onSubmit={handleCreateBooking} className={styles.modalForm}>
            <TextField select label="Аудитория" size="small" fullWidth value={room} onChange={(e) => setRoom(e.target.value)} required>
              <MenuItem value="101">Аудитория 101 (Конференц-зал)</MenuItem>
              <MenuItem value="204">Аудитория 204 (Лекционная)</MenuItem>
            </TextField>
            <TextField type="date" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Дата" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Stack direction="row" spacing={2}>
              <TextField type="time" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Начало" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
              <TextField type="time" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} label="Конец" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end", mt: 1 }}>
              <Button variant="outlined" color="inherit" onClick={() => setOpenModal(false)} sx={{ textTransform: "none" }}>
                Отмена
              </Button>
              <Button type="submit" variant="contained" color="primary" sx={{ textTransform: "none" }}>
                Подтвердить
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Modal>
    </Box>
  );
}
