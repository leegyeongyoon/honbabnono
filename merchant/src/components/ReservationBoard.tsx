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
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  SelectChangeEvent,
} from '@mui/material';
import {
  AccessTime,
  Person,
  Group,
  Restaurant,
  Refresh,
  Add,
  NotificationsActive,
  EventBusy,
} from '@mui/icons-material';
import apiClient from '../utils/api';
import useRestaurantSocket from '../hooks/useRestaurantSocket';
import { formatOptionsLabel } from '../utils/formatOptions';
import {
  requestNotificationPermission,
  showBrowserNotification,
  playBeep,
  getNotificationPermission,
} from '../utils/notify';
import { ARRIVAL_STATUS, RESERVATION_STATUS } from '../theme';
import { PageHeader, EmptyState, StatusChip } from './common';

// ── Types ──────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
  unit_price?: number;
  options?: any;
}

interface Reservation {
  id: string; // UUID
  reservation_date?: string;
  reservation_time: string;
  customer_name: string;
  customer_phone?: string;
  party_size: number;
  orders?: OrderItem[];
  arrival_status?: string;
  status: string;
  special_request?: string; // API 필드명 (기존 special_requests 오독)
  is_manual?: boolean;
  menu_name?: string;
}

type ReservationStatus =
  | 'all'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'seated'
  | 'completed'
  | 'cancelled';

type ViewMode = 'day' | 'week' | 'month';

// 상태색/도착색은 중앙 테마(ARRIVAL_STATUS / RESERVATION_STATUS)에서 가져옴

// ── Date helpers ───────────────────────────────────────────────
const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 선택일이 포함된 주의 월요일 반환
const getWeekStart = (dateStr: string): Date => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=일 ~ 6=토
  const diff = dow === 0 ? -6 : 1 - dow; // 월요일까지 이동
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const WEEK_DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const EMPTY_MANUAL = {
  guest_name: '',
  guest_phone: '',
  reservation_date: '',
  reservation_time: '12:00',
  party_size: '2',
  special_request: '',
};

// ── Component ──────────────────────────────────────────────────
const ReservationBoard: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus>('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // noshow confirm dialog
  const [noshowTarget, setNoshowTarget] = useState<Reservation | null>(null);

  // notification permission
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  );

  // manual reservation dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ ...EMPTY_MANUAL });
  const [manualSaving, setManualSaving] = useState(false);

  // snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ── Fetch ──
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {};
      if (viewMode === 'week') {
        const start = getWeekStart(selectedDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        params.start_date = toDateStr(start);
        params.end_date = toDateStr(end);
      } else if (viewMode === 'month') {
        const base = new Date(selectedDate + 'T00:00:00');
        const start = new Date(base.getFullYear(), base.getMonth(), 1);
        const end = new Date(base.getFullYear(), base.getMonth() + 1, 0); // 말일
        params.start_date = toDateStr(start);
        params.end_date = toDateStr(end);
      } else {
        params.date = selectedDate;
      }
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/api/reservations/merchant', { params });
      const d = res.data.data || res.data;
      setReservations(d.reservations ?? (Array.isArray(d) ? d : []));
    } catch (err: any) {
      setError(err.response?.data?.message || '예약 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, viewMode]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // 자동 새로고침 30초
  useEffect(() => {
    const id = setInterval(fetchReservations, 30_000);
    return () => clearInterval(id);
  }, [fetchReservations]);

  // ── 실시간 소켓 ──
  useRestaurantSocket({
    onNewReservation: (payload) => {
      fetchReservations();
      showBrowserNotification(
        '새 예약',
        `${payload.customerName} ${payload.partySize}명 ${payload.reservationTime}`
      );
      playBeep();
    },
    onCancelled: () => fetchReservations(),
    onCheckin: () => fetchReservations(),
    onArrival: (payload) => {
      fetchReservations();
      // 고객이 도착했거나 근처에 왔을 때 점주에게 알림음 + 브라우저 알림 (조리/상차림 마무리 신호)
      if (payload.arrivalStatus === 'arrived') {
        showBrowserNotification('고객 도착', `${payload.userName ?? '고객'}님이 도착했습니다`);
        playBeep();
      } else if (payload.arrivalStatus === 'nearby') {
        showBrowserNotification('고객 근처 도착', `${payload.userName ?? '고객'}님이 근처에 왔습니다`);
        playBeep();
      }
    },
  });

  const handleRequestNotif = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  // ── Status transition ──
  const updateStatus = async (id: string, status: string) => {
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

  // ── Manual reservation ──
  const openManual = () => {
    setManualForm({ ...EMPTY_MANUAL, reservation_date: selectedDate });
    setManualOpen(true);
  };

  const handleManualChange = (field: keyof typeof EMPTY_MANUAL, value: string) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleManualSave = async () => {
    if (!manualForm.guest_name.trim()) {
      setSnackbar({ open: true, message: '예약자 이름을 입력해주세요.', severity: 'error' });
      return;
    }
    if (!manualForm.reservation_date) {
      setSnackbar({ open: true, message: '예약 날짜를 선택해주세요.', severity: 'error' });
      return;
    }
    setManualSaving(true);
    try {
      await apiClient.post('/api/reservations/manual', {
        reservation_date: manualForm.reservation_date,
        reservation_time: manualForm.reservation_time,
        party_size: Number(manualForm.party_size) || 1,
        guest_name: manualForm.guest_name.trim(),
        guest_phone: manualForm.guest_phone.trim() || undefined,
        special_request: manualForm.special_request.trim() || undefined,
      });
      setManualOpen(false);
      setSnackbar({ open: true, message: '수동 예약이 추가되었습니다.', severity: 'success' });
      fetchReservations();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '수동 예약 추가에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setManualSaving(false);
    }
  };

  // ── Render helpers ──
  // 도착 상태별 카드 좌측 강조선 — 점주가 "가는 중/근처/도착"을 한눈에 보고 조리 타이밍 결정
  const arrivalCardSx = (arrival?: string) => {
    const map: Record<string, { color: string; bg: string }> = {
      arrived:    { color: '#2E7D4F', bg: '#F2FAF5' },
      nearby:     { color: '#2563A8', bg: '#F1F6FC' },
      on_the_way: { color: '#C77700', bg: '#FFFAF2' },
    };
    const v = arrival ? map[arrival] : undefined;
    return v
      ? { borderLeft: `4px solid ${v.color}`, backgroundColor: v.bg }
      : {};
  };

  // 도착 임박 고객을 위로 — arrived > nearby > on_the_way > 그외, 그 다음 시간순
  const arrivalRank = (a?: string) =>
    a === 'arrived' ? 0 : a === 'nearby' ? 1 : a === 'on_the_way' ? 2 : 3;
  const byArrivalThenTime = (a: Reservation, b: Reservation) => {
    const d = arrivalRank(a.arrival_status) - arrivalRank(b.arrival_status);
    return d !== 0 ? d : formatTime(a.reservation_time).localeCompare(formatTime(b.reservation_time));
  };

  const renderArrivalChip = (arrival?: string) => {
    if (!arrival) return null;
    return (
      <StatusChip
        status={arrival}
        map={ARRIVAL_STATUS}
        variant={arrival === 'arrived' ? 'filled' : 'outlined'}
      />
    );
  };

  const renderStatusChip = (status: string) => (
    <StatusChip status={status} map={RESERVATION_STATUS} />
  );

  const renderOptions = (options: any) => {
    try {
      const label = formatOptionsLabel(options);
      if (!label) return null;
      return (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 2.5 }}>
          · {label}
        </Typography>
      );
    } catch {
      return null;
    }
  };

  const renderActions = (r: Reservation) => {
    const buttons: React.ReactNode[] = [];

    if (r.status === 'confirmed') {
      buttons.push(
        <Button key="prep" size="small" variant="contained" color="primary"
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

  const formatTime = (value: string | null | undefined): string => {
    if (!value) return '-';
    if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      return value.slice(0, 5);
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Week grid 데이터 ──
  const weekDays = (() => {
    if (viewMode !== 'week') return [];
    const start = getWeekStart(selectedDate);
    const days: { dateStr: string; label: string; dayLabel: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toDateStr(d);
      days.push({
        dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayLabel: WEEK_DAY_LABELS[i],
      });
    }
    return days;
  })();

  // ── Month grid 데이터 (일요일 시작, 앞뒤 빈 칸 패딩) ──
  const MONTH_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  const monthCells = (() => {
    if (viewMode !== 'month') return [];
    const base = new Date(selectedDate + 'T00:00:00');
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDow = new Date(year, month, 1).getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateStr: string; day: number } | null> = [];
    for (let i = 0; i < firstDow; i++) cells.push(null); // 선행 빈 칸
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ dateStr: toDateStr(new Date(year, month, d)), day: d });
    }
    while (cells.length % 7 !== 0) cells.push(null); // 후행 빈 칸
    return cells;
  })();

  const monthTitle = (() => {
    const base = new Date(selectedDate + 'T00:00:00');
    return `${base.getFullYear()}년 ${base.getMonth() + 1}월`;
  })();

  const reservationsForDate = (dateStr: string): Reservation[] => {
    return reservations
      .filter((r) => {
        const rd = r.reservation_date ? String(r.reservation_date).slice(0, 10) : '';
        return rd === dateStr;
      })
      .sort((a, b) => formatTime(a.reservation_time).localeCompare(formatTime(b.reservation_time)));
  };

  // ── JSX ──
  return (
    <Box>
      {/* Header */}
      <PageHeader
        title="예약 관리"
        actions={
          <>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_e, val) => { if (val) setViewMode(val); }}
            >
              <ToggleButton value="day">일간</ToggleButton>
              <ToggleButton value="week">주간</ToggleButton>
              <ToggleButton value="month">월간</ToggleButton>
            </ToggleButtonGroup>

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

            <Button startIcon={<Refresh />} onClick={fetchReservations} variant="outlined" color="primary" size="small">
              새로고침
            </Button>

            <Button startIcon={<Add />} onClick={openManual} variant="contained" color="primary" size="small">
              수동 예약 추가
            </Button>

            {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
              <Button
                startIcon={<NotificationsActive />}
                onClick={handleRequestNotif}
                variant="outlined"
                size="small"
                color="warning"
              >
                {notifPermission === 'denied' ? '알림 차단됨' : '알림 켜기'}
              </Button>
            )}
          </>
        }
      />

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {/* ── Week view ── */}
      {!loading && viewMode === 'week' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(7, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {weekDays.map((day) => {
            const dayReservations = reservationsForDate(day.dateStr);
            const isSelected = day.dateStr === selectedDate;
            return (
              <Card
                key={day.dateStr}
                variant="outlined"
                sx={{
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderWidth: isSelected ? 2 : 1,
                  minHeight: 220,
                  cursor: 'pointer',
                  bgcolor: isSelected ? 'custom.brandSoft' : 'background.paper',
                }}
                onClick={() => setSelectedDate(day.dateStr)}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ color: isSelected ? 'primary.dark' : 'text.primary' }}
                    >
                      {day.dayLabel} {day.label}
                    </Typography>
                    <Chip
                      label={`${dayReservations.length}건`}
                      size="small"
                      color={dayReservations.length ? 'primary' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Divider sx={{ mb: 1 }} />
                  {dayReservations.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">예약 없음</Typography>
                  ) : (
                    dayReservations.map((r) => (
                      <Box key={r.id} sx={{ mb: 0.75 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                          {formatTime(r.reservation_time)} · {r.customer_name} {r.party_size}명
                          {r.is_manual ? ' (전화)' : ''}
                        </Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Month view ── */}
      {!loading && viewMode === 'month' && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            {monthTitle}
          </Typography>

          {/* 요일 헤더 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 1,
              mb: 1,
            }}
          >
            {MONTH_DAY_LABELS.map((label, i) => (
              <Typography
                key={label}
                variant="caption"
                align="center"
                sx={{
                  fontWeight: 700,
                  color: i === 0 ? 'error.main' : i === 6 ? 'info.main' : 'text.secondary',
                }}
              >
                {label}
              </Typography>
            ))}
          </Box>

          {/* 날짜 그리드 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 1,
            }}
          >
            {monthCells.map((cell, idx) => {
              if (!cell) {
                return <Box key={`empty-${idx}`} sx={{ minHeight: { xs: 64, sm: 96 } }} />;
              }
              const dayReservations = reservationsForDate(cell.dateStr);
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === today;
              return (
                <Card
                  key={cell.dateStr}
                  variant="outlined"
                  sx={{
                    minHeight: { xs: 64, sm: 96 },
                    cursor: 'pointer',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderWidth: isSelected ? 2 : 1,
                    bgcolor: isSelected ? 'custom.brandSoft' : 'background.paper',
                  }}
                  onClick={() => {
                    setSelectedDate(cell.dateStr);
                    setViewMode('day');
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: isToday ? 'primary.dark' : 'text.primary',
                        }}
                      >
                        {cell.day}
                        {isToday ? ' (오늘)' : ''}
                      </Typography>
                      {dayReservations.length > 0 && (
                        <Chip
                          label={`${dayReservations.length}`}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                        />
                      )}
                    </Box>
                    {dayReservations.slice(0, 2).map((r) => (
                      <Typography
                        key={r.id}
                        variant="caption"
                        noWrap
                        sx={{ display: 'block', fontSize: 10, color: 'text.secondary' }}
                      >
                        {formatTime(r.reservation_time)} {r.customer_name}
                      </Typography>
                    ))}
                    {dayReservations.length > 2 && (
                      <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: 'text.disabled' }}>
                        +{dayReservations.length - 2}건
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── Day view ── */}
      {!loading && viewMode === 'day' && (
        <>
          {/* Empty */}
          {reservations.length === 0 && (
            <EmptyState
              icon={<EventBusy />}
              title="해당 날짜에 예약이 없습니다"
              description="다른 날짜를 선택하거나 수동 예약을 추가해보세요."
            />
          )}

          {/* Cards */}
          <Grid container spacing={2}>
            {[...reservations].sort(byArrivalThenTime).map((r) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                <Card variant="outlined" sx={arrivalCardSx(r.arrival_status)}>
                  <CardContent sx={{ pb: 1 }}>
                    {/* Time + status chips */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" sx={{ color: 'primary.dark' }} />
                        <Typography variant="h6" fontWeight={700}>{formatTime(r.reservation_time)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {r.is_manual && <Chip label="전화예약" size="small" sx={{ bgcolor: 'custom.brandSoft', color: 'primary.dark' }} />}
                        {renderStatusChip(r.status)}
                        {renderArrivalChip(r.arrival_status)}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* Info */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Person fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2">{r.customer_name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Group fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2">{r.party_size}명</Typography>
                      </Box>
                    </Box>

                    {/* Orders */}
                    {r.orders && r.orders.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Restaurant fontSize="small" sx={{ color: 'primary.dark' }} />
                          <Typography variant="body2" fontWeight={600}>주문 메뉴</Typography>
                        </Box>
                        {r.orders.map((o, i) => (
                          <Box key={i}>
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 2.5 }}>
                              {o.name} x {o.quantity}
                            </Typography>
                            {renderOptions(o.options)}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {r.special_request && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        요청사항: {r.special_request}
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
        </>
      )}

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

      {/* Manual Reservation Dialog */}
      <Dialog open={manualOpen} onClose={() => !manualSaving && setManualOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>수동 예약 추가</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="예약자 이름"
            value={manualForm.guest_name}
            required
            fullWidth
            onChange={(e) => handleManualChange('guest_name', e.target.value)}
          />
          <TextField
            label="전화번호"
            value={manualForm.guest_phone}
            fullWidth
            onChange={(e) => handleManualChange('guest_phone', e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="예약 날짜"
              type="date"
              value={manualForm.reservation_date}
              onChange={(e) => handleManualChange('reservation_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="시간"
              type="time"
              value={manualForm.reservation_time}
              onChange={(e) => handleManualChange('reservation_time', e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              sx={{ width: 130 }}
            />
          </Box>
          <TextField
            label="인원"
            type="number"
            value={manualForm.party_size}
            onChange={(e) => handleManualChange('party_size', e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ width: 120 }}
          />
          <TextField
            label="요청사항"
            value={manualForm.special_request}
            multiline
            rows={2}
            fullWidth
            onChange={(e) => handleManualChange('special_request', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} disabled={manualSaving}>취소</Button>
          <Button
            onClick={handleManualSave}
            variant="contained"
            color="primary"
            disabled={manualSaving || !manualForm.guest_name.trim() || !manualForm.reservation_date}
          >
            {manualSaving ? <CircularProgress size={20} color="inherit" /> : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReservationBoard;
