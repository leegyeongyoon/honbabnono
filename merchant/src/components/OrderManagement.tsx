import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  TextField,
} from '@mui/material';
import {
  AccessTime,
  Person,
  Group,
  ArrowForward,
  Refresh,
  Cancel,
  RestaurantMenu,
} from '@mui/icons-material';
import apiClient from '../utils/api';
import useRestaurantSocket from '../hooks/useRestaurantSocket';
import { formatOptionsLabel } from '../utils/formatOptions';
import { KANBAN_COLUMNS } from '../theme';
import { EmptyState, PageHeader } from './common';

// ── Types ──────────────────────────────────────────────────────
interface OrderItem {
  menu_name: string;
  quantity: number;
  unit_price?: number;
  options?: any;
}

interface Order {
  id: string; // UUID
  reservation_time: string;
  customer_name: string;
  party_size: number;
  items: OrderItem[]; // API 응답 필드명은 items (기존 order_items 오독으로 메뉴가 안 보였음)
  cooking_status: CookingStatus;
  total_amount?: number;
  cooking_started_at?: string;
  cooking_ready_at?: string;
}

type CookingStatus = 'pending' | 'preparing' | 'cooking' | 'ready' | 'served' | 'rejected';

// ── Constants ──────────────────────────────────────────────────
// 칸반 컬럼 정의(배경 bg + accent)는 중앙 테마(KANBAN_COLUMNS)에서 가져옴
const COLUMNS = KANBAN_COLUMNS;

const NEXT_STATUS: Record<string, CookingStatus> = {
  pending:   'preparing',
  preparing: 'cooking',
  cooking:   'ready',
  ready:     'served',
};

const NEXT_LABEL: Record<string, string> = {
  pending:   '준비 시작',
  preparing: '조리 시작',
  cooking:   '조리 완료',
  ready:     '서빙 완료',
};

const REJECT_REASONS = [
  '재료 소진',
  '영업 종료',
  '주문 과다',
  '기타',
];

// ── Helper ─────────────────────────────────────────────────────
const estimatePrepEnd = (order: Order): string | null => {
  if (!order.cooking_started_at) return null;
  const start = new Date(order.cooking_started_at);
  // 기본 20분 예상
  const est = new Date(start.getTime() + 20 * 60 * 1000);
  return est.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

// ── Component ──────────────────────────────────────────────────
const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetOrder, setRejectTargetOrder] = useState<Order | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/api/orders/merchant', { params: { date: today } });
      const d = res.data.data || res.data;
      setOrders(d.orders ?? (Array.isArray(d) ? d : []));
    } catch (err: any) {
      setError(err.response?.data?.message || '주문 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 자동 새로고침 15초
  useEffect(() => {
    const id = setInterval(fetchOrders, 15_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // 실시간 소켓: 새 예약(=새 주문) 수신 시 즉시 갱신
  useRestaurantSocket({
    onNewReservation: () => fetchOrders(),
  });

  const advanceStatus = async (orderId: string, currentStatus: CookingStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await apiClient.put(`/api/orders/${orderId}/cooking-status`, { cooking_status: next });
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || '상태 변경에 실패했습니다.');
    }
  };

  const openRejectDialog = (order: Order) => {
    setRejectTargetOrder(order);
    setSelectedRejectReason('');
    setCustomRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTargetOrder) return;
    const reason = selectedRejectReason === '기타' ? customRejectReason : selectedRejectReason;
    if (!reason.trim()) {
      alert('거절 사유를 선택하거나 입력해주세요.');
      return;
    }

    setRejecting(true);
    try {
      await apiClient.put(`/api/orders/${rejectTargetOrder.id}/reject`, { reject_reason: reason });
      setRejectDialogOpen(false);
      setRejectTargetOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || '주문 거절에 실패했습니다.');
    } finally {
      setRejecting(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const ordersByStatus = (status: CookingStatus) =>
    orders.filter((o) => o.cooking_status === status);

  return (
    <Box>
      {/* Header */}
      <PageHeader
        title="주문 관리"
        actions={
          <>
            <Chip label={today} size="small" />
            <Button
              startIcon={<Refresh />}
              onClick={fetchOrders}
              variant="outlined"
              color="primary"
              size="small"
            >
              새로고침
            </Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {/* Kanban columns */}
      <Grid container spacing={2}>
        {COLUMNS.map((col) => {
          const items = ordersByStatus(col.status);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={col.status}>
              <Box
                sx={{
                  bgcolor: col.bg,
                  borderRadius: 2.5,
                  p: 2,
                  minHeight: 400,
                }}
              >
                {/* Column header — accent 색 바 + 칩으로 의미 강화 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ width: 4, height: 18, borderRadius: 2, bgcolor: col.accent }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: col.accent }}>
                    {col.label}
                  </Typography>
                  <Chip
                    label={items.length}
                    size="small"
                    sx={{ ml: 'auto', fontWeight: 700, bgcolor: col.accent, color: '#fff' }}
                  />
                </Box>

                {/* Cards */}
                {items.length === 0 && (
                  <EmptyState icon={<RestaurantMenu />} title="주문 없음" dense />
                )}

                {items.map((order) => (
                  <Card
                    key={order.id}
                    variant="outlined"
                    sx={{ mb: 1.5 }}
                  >
                    <CardContent sx={{ pb: '12px !important' }}>
                      {/* Time + party */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime fontSize="small" sx={{ color: 'primary.dark' }} />
                          <Typography variant="subtitle1" fontWeight={700}>
                            {formatTime(order.reservation_time)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Group fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{order.party_size}명</Typography>
                        </Box>
                      </Box>

                      {/* Customer */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <Person fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{order.customer_name}</Typography>
                      </Box>

                      <Divider sx={{ mb: 1 }} />

                      {/* Menu items */}
                      {order.items?.map((item, i) => {
                        const optLabel = formatOptionsLabel(item.options);
                        return (
                          <Box key={i}>
                            <Typography variant="body2" color="text.secondary">
                              {item.menu_name} x {item.quantity}
                            </Typography>
                            {optLabel && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1.5 }}>
                                · {optLabel}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}

                      {/* Estimated prep end time */}
                      {(order.cooking_status === 'preparing' || order.cooking_status === 'cooking') && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'warning.main', fontWeight: 600 }}>
                          예상 완료: {estimatePrepEnd(order) || '-'}
                        </Typography>
                      )}

                      {/* Action buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        {/* Reject button (only for pending) */}
                        {order.cooking_status === 'pending' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            sx={{ flex: 1 }}
                            onClick={() => openRejectDialog(order)}
                          >
                            거절
                          </Button>
                        )}

                        {/* Next step button */}
                        {NEXT_STATUS[order.cooking_status] && (
                          <Button
                            fullWidth={order.cooking_status !== 'pending'}
                            size="small"
                            variant="contained"
                            color="primary"
                            endIcon={<ArrowForward />}
                            sx={{ flex: 1 }}
                            onClick={() => advanceStatus(order.id, order.cooking_status)}
                          >
                            {NEXT_LABEL[order.cooking_status]}
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>주문 거절 사유 선택</DialogTitle>
        <DialogContent>
          <List>
            {REJECT_REASONS.map((reason) => (
              <ListItemButton
                key={reason}
                selected={selectedRejectReason === reason}
                onClick={() => setSelectedRejectReason(reason)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'warning.light',
                    '&:hover': { bgcolor: 'warning.light' },
                  },
                }}
              >
                <ListItemText primary={reason} />
              </ListItemButton>
            ))}
          </List>
          {selectedRejectReason === '기타' && (
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="거절 사유를 입력해주세요..."
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={rejecting || !selectedRejectReason || (selectedRejectReason === '기타' && !customRejectReason.trim())}
          >
            {rejecting ? <CircularProgress size={20} color="inherit" /> : '거절 확인'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderManagement;
