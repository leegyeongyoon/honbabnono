import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import {
  AccessTime,
  Person,
  Group,
  Restaurant,
  Refresh,
} from '@mui/icons-material';
import apiClient from '../utils/api';

// ── Types ──────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
}

interface Reservation {
  id: number;
  reservation_time: string;
  customer_name: string;
  party_size: number;
  orders?: OrderItem[];
  arrival_status?: string;
  status: string;
  special_requests?: string;
}

type ReservationStatus =
  | 'all'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'seated'
  | 'completed'
  | 'cancelled';

// ── Style constants ────────────────────────────────────────────
const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';
const BRAND_LIGHT = '#FAF6F3';

const ARRIVAL_CHIP: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  on_time:  { label: '정시 도착', color: 'success' },
  delayed:  { label: '지연',      color: 'warning' },
  nearby:   { label: '근처 도착', color: 'info' },
  arrived:  { label: '도착',      color: 'success' },
  noshow:   { label: '노쇼',      color: 'error' },
};

const STATUS_CHIP: Record<string, { label: string; color: 'info' | 'warning' | 'success' | 'secondary' | 'default' }> = {
  confirmed:  { label: '확정',     color: 'info' },
  preparing:  { label: '준비중',   color: 'warning' },
  ready:      { label: '조리완료', color: 'success' },
  seated:     { label: '착석',     color: 'secondary' },
  completed:  { label: '완료',     color: 'default' },
  cancelled:  { label: '취소',     color: 'default' },
};

// ── Component ──────────────────────────────────────────────────
const ReservationBoard: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus>('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // noshow confirm dialog
  const [noshowTarget, setNoshowTarget] = useState<Reservation | null>(null);

  // ── Fetch ──
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = { date: selectedDate };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/api/reservations/merchant', { params });
      setReservations(res.data.reservations ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '예약 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // 자동 새로고침 30초
  useEffect(() => {
    const id = setInterval(fetchReservations, 30_000);
    return () => clearInterval(id);
  }, [fetchReservations]);

  // ── Status transition ──
  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.put(`/api/reservations/${id}/status`, { status });
      fetchReservations();
    } catch (err: any) {
      alert(err.response?.data?.message || '상태 변경에 실패했습니다.');
    }
  };

  const handleNoshow = async () => {
    if (!noshowTarget) return;
    try {
      await apiClient.put(`/api/reservations/${noshowTarget.id}/noshow`);
      setNoshowTarget(null);
      fetchReservations();
    } catch (err: any) {
      alert(err.response?.data?.message || '노쇼 처리에 실패했습니다.');
    }
  };

  // ── Render helpers ──
  const renderArrivalChip = (arrival?: string) => {
    if (!arrival) return null;
    const cfg = ARRIVAL_CHIP[arrival];
    if (!cfg) return <Chip label={arrival} size="small" />;
    return <Chip label={cfg.label} color={cfg.color} size="small" variant={arrival === 'arrived' ? 'filled' : 'outlined'} />;
  };

  const renderStatusChip = (status: string) => {
    const cfg = STATUS_CHIP[status];
    if (!cfg) return <Chip label={status} size="small" />;
    return <Chip label={cfg.label} color={cfg.color} size="small" />;
  };

  const renderActions = (r: Reservation) => {
    const buttons: React.ReactNode[] = [];

    if (r.status === 'confirmed') {
      buttons.push(
        <Button key="prep" size="small" variant="contained" sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK } }}
          onClick={() => updateStatus(r.id, 'preparing')}>
          준비 시작
        </Button>,
      );
    }
    if (r.status === 'preparing') {
      buttons.push(
        <Button key="ready" size="small" variant="contained" color="success"
          onClick={() => updateStatus(r.id, 'ready')}>
          조리 완료
        </Button>,
      );
    }
    if (r.status === 'ready') {
      buttons.push(
        <Button key="seat" size="small" variant="contained" color="secondary"
          onClick={() => updateStatus(r.id, 'seated')}>
          착석 확인
        </Button>,
      );
    }
    if (r.status === 'seated') {
      buttons.push(
        <Button key="done" size="small" variant="contained" color="inherit"
          onClick={() => updateStatus(r.id, 'completed')}>
          식사 완료
        </Button>,
      );
    }
    if (r.status === 'confirmed' || r.status === 'preparing') {
      buttons.push(
        <Button key="noshow" size="small" variant="outlined" color="error"
          onClick={() => setNoshowTarget(r)}>
          노쇼 처리
        </Button>,
      );
    }
    return buttons;
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  // ── JSX ──
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>예약 관리</Typography>

        <TextField
          type="date"
          size="small"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          sx={{ width: 180 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>상태 필터</InputLabel>
          <Select
            value={statusFilter}
            label="상태 필터"
            onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as ReservationStatus)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="confirmed">확정</MenuItem>
            <MenuItem value="preparing">준비중</MenuItem>
            <MenuItem value="ready">조리완료</MenuItem>
            <MenuItem value="seated">착석</MenuItem>
            <MenuItem value="completed">완료</MenuItem>
            <MenuItem value="cancelled">취소</MenuItem>
          </Select>
        </FormControl>

        <Button startIcon={<Refresh />} onClick={fetchReservations} variant="outlined" size="small"
          sx={{ borderColor: BRAND, color: BRAND_DARK }}>
          새로고침
        </Button>
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: BRAND }} />
        </Box>
      )}

      {/* Empty */}
      {!loading && reservations.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          해당 날짜에 예약이 없습니다.
        </Typography>
      )}

      {/* Cards */}
      <Grid container spacing={2}>
        {reservations.map((r) => (
          <Grid item xs={12} sm={6} md={4} key={r.id}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                borderColor: 'rgba(17,17,17,0.06)',
                '&:hover': { boxShadow: '0 2px 12px rgba(17,17,17,0.08)' },
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                {/* Time + status chips */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime fontSize="small" sx={{ color: BRAND_DARK }} />
                    <Typography variant="h6" fontWeight={700}>{formatTime(r.reservation_time)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {renderStatusChip(r.status)}
                    {renderArrivalChip(r.arrival_status)}
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Info */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2">{r.customer_name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Group fontSize="small" />
                    <Typography variant="body2">{r.party_size}명</Typography>
                  </Box>
                </Box>

                {/* Orders */}
                {r.orders && r.orders.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Restaurant fontSize="small" sx={{ color: BRAND_DARK }} />
                      <Typography variant="body2" fontWeight={600}>주문 메뉴</Typography>
                    </Box>
                    {r.orders.map((o, i) => (
                      <Typography key={i} variant="body2" color="text.secondary" sx={{ pl: 2.5 }}>
                        {o.name} x {o.quantity}
                      </Typography>
                    ))}
                  </Box>
                )}

                {r.special_requests && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                    요청사항: {r.special_requests}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
                {renderActions(r)}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Noshow Confirm Dialog */}
      <Dialog open={!!noshowTarget} onClose={() => setNoshowTarget(null)}>
        <DialogTitle>노쇼 처리 확인</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{noshowTarget?.customer_name}</strong> ({formatTime(noshowTarget?.reservation_time || '')}) 예약을 노쇼 처리하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            노쇼 처리 시 고객에게 페널티가 부과됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoshowTarget(null)}>취소</Button>
          <Button onClick={handleNoshow} color="error" variant="contained">노쇼 처리</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReservationBoard;
