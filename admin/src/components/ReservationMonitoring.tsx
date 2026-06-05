import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Card,
  CardContent,
  Grid,
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
import { RESERVATION_STATUS, PAYMENT_STATUS } from '../theme';
import { formatDate } from '../utils/format';
import { PageHeader, EmptyState, LoadingSkeleton, StatusChip, ResponsiveTableContainer } from './common';

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

  const summaryCards: { key: string; label: string; icon: React.ReactNode; color: 'primary' | 'info' | 'success' | 'error' | 'secondary' }[] = [
    { key: 'all', label: '전체', icon: <CalendarMonthIcon />, color: 'primary' },
    { key: 'confirmed', label: '확정', icon: <CheckCircleIcon />, color: 'primary' },
    { key: 'preparing', label: '준비중', icon: <HourglassEmptyIcon />, color: 'info' },
    { key: 'completed', label: '완료', icon: <DoneAllIcon />, color: 'success' },
    { key: 'cancelled', label: '취소', icon: <CancelIcon />, color: 'error' },
    { key: 'no_show', label: '노쇼', icon: <PersonOffIcon />, color: 'error' },
  ];

  return (
    <Box>
      <PageHeader title="예약 모니터링" />

      {/* 상태별 집계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(card => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={card.key}>
            <Card
              sx={{
                cursor: 'pointer',
                borderColor: statusFilter === card.key ? `${card.color}.main` : 'transparent',
                borderWidth: 2,
                borderStyle: 'solid',
              }}
              onClick={() => setStatusFilter(card.key)}
            >
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ color: `${card.color}.main`, mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: `${card.color}.main` }}>
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
        <LoadingSkeleton variant="table" columns={7} />
      ) : filteredReservations.length === 0 ? (
        <EmptyState icon={<EventAvailableIcon />} title="해당 날짜의 예약이 없습니다." />
      ) : (
        <ResponsiveTableContainer minWidth={840}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>매장명</TableCell>
                <TableCell>고객명</TableCell>
                <TableCell>날짜/시간</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>인원</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>메뉴</TableCell>
                <TableCell>상태</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>결제상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id} hover>
                  <TableCell>{reservation.restaurant_name || '-'}</TableCell>
                  <TableCell>{reservation.customer_name || '-'}</TableCell>
                  <TableCell>
                    {formatDate(reservation.reservation_date)}
                    {' '}
                    {reservation.reservation_time || ''}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{reservation.party_size || '-'}명</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reservation.menu_items || '-'}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={reservation.status} map={RESERVATION_STATUS} />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <StatusChip status={reservation.payment_status || 'pending'} map={PAYMENT_STATUS} variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
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
