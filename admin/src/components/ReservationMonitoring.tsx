import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import apiClient from '../utils/api';

interface Reservation {
  id: string;
  restaurant_name: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  menu_items?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled' | 'no_show';
  payment_status?: 'pending' | 'paid' | 'refunded';
}

const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { label: '대기중', color: 'warning' },
  confirmed: { label: '확정', color: 'primary' },
  preparing: { label: '준비중', color: 'info' },
  completed: { label: '완료', color: 'success' },
  cancelled: { label: '취소', color: 'error' },
  no_show: { label: '노쇼', color: 'default' },
};

const paymentStatusConfig: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  pending: { label: '미결제', color: 'warning' },
  paid: { label: '결제완료', color: 'success' },
  refunded: { label: '환불', color: 'error' },
};

const ReservationMonitoring: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' as 'success' | 'error' });

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/reservations', {
        params: { date: selectedDate },
      });
      const body = response.data as any;
      const data = body?.reservations || body?.data || body || [];
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('예약 목록 조회 실패:', error);
      setSnackbar({ open: true, message: '예약 목록을 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(r => {
    return statusFilter === 'all' || r.status === statusFilter;
  });

  const getStatusCount = (status: string) => {
    if (status === 'all') return reservations.length;
    return reservations.filter(r => r.status === status).length;
  };

  const summaryCards = [
    { key: 'all', label: '전체', icon: <CalendarMonthIcon />, color: '#C9B59C' },
    { key: 'confirmed', label: '확정', icon: <CheckCircleIcon />, color: '#1976D2' },
    { key: 'preparing', label: '준비중', icon: <HourglassEmptyIcon />, color: '#0288D1' },
    { key: 'completed', label: '완료', icon: <DoneAllIcon />, color: '#2E7D4F' },
    { key: 'cancelled', label: '취소', icon: <CancelIcon />, color: '#D32F2F' },
    { key: 'no_show', label: '노쇼', icon: <PersonOffIcon />, color: '#757575' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        예약 모니터링
      </Typography>

      {/* 상태별 집계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(card => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={card.key}>
            <Card
              sx={{
                cursor: 'pointer',
                border: statusFilter === card.key ? `2px solid ${card.color}` : '2px solid transparent',
              }}
              onClick={() => setStatusFilter(card.key)}
            >
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ color: card.color, mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: card.color }}>
                  {getStatusCount(card.key)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 날짜 선택 & 필터 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          type="date"
          label="날짜"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>상태 필터</InputLabel>
          <Select
            value={statusFilter}
            label="상태 필터"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="pending">대기중</MenuItem>
            <MenuItem value="confirmed">확정</MenuItem>
            <MenuItem value="preparing">준비중</MenuItem>
            <MenuItem value="completed">완료</MenuItem>
            <MenuItem value="cancelled">취소</MenuItem>
            <MenuItem value="no_show">노쇼</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {filteredReservations.length}건 표시 중
        </Typography>
      </Box>

      {/* 테이블 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9F8F6' }}>
                <TableCell sx={{ fontWeight: 600 }}>매장명</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>고객명</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>날짜/시간</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>인원</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>메뉴</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>결제상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <EventAvailableIcon sx={{ fontSize: 48, color: '#D9CFC7', mb: 1 }} />
                    <Typography color="text.secondary">해당 날짜의 예약이 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((reservation) => {
                  const stCfg = statusConfig[reservation.status] || { label: reservation.status, color: 'default' };
                  const payCfg = paymentStatusConfig[reservation.payment_status || 'pending'] || { label: '-', color: 'default' };
                  return (
                    <TableRow key={reservation.id} hover>
                      <TableCell>{reservation.restaurant_name || '-'}</TableCell>
                      <TableCell>{reservation.customer_name || '-'}</TableCell>
                      <TableCell>
                        {reservation.reservation_date
                          ? new Date(reservation.reservation_date).toLocaleDateString('ko-KR')
                          : '-'}
                        {' '}
                        {reservation.reservation_time || ''}
                      </TableCell>
                      <TableCell>{reservation.party_size || '-'}명</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reservation.menu_items || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={stCfg.label} size="small" color={stCfg.color} />
                      </TableCell>
                      <TableCell>
                        <Chip label={payCfg.label} size="small" color={payCfg.color} variant="outlined" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReservationMonitoring;
