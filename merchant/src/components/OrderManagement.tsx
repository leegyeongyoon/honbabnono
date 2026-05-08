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
} from '@mui/icons-material';
import apiClient from '../utils/api';

// ── Types ──────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
}

interface Order {
  id: number;
  reservation_time: string;
  customer_name: string;
  party_size: number;
  order_items: OrderItem[];
  cooking_status: CookingStatus;
  total_amount?: number;
  cooking_started_at?: string;
  cooking_ready_at?: string;
}

type CookingStatus = 'pending' | 'preparing' | 'cooking' | 'ready' | 'served' | 'rejected';

// ── Constants ──────────────────────────────────────────────────
const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';

const COLUMNS: { status: CookingStatus; label: string; color: string }[] = [
  { status: 'pending',   label: '대기중', color: '#E0E0E0' },
  { status: 'preparing', label: '준비중', color: '#FFF3E0' },
  { status: 'cooking',   label: '조리중', color: '#FFF8E1' },
  { status: 'ready',     label: '완료',   color: '#E8F5E9' },
];

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

  const advanceStatus = async (orderId: number, currentStatus: CookingStatus) => {
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>주문 관리</Typography>
        <Chip label={today} size="small" />
        <Button startIcon={<Refresh />} onClick={fetchOrders} variant="outlined" size="small"
          sx={{ borderColor: BRAND, color: BRAND_DARK, ml: 'auto' }}>
          새로고침
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: BRAND }} />
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
                  bgcolor: col.color,
                  borderRadius: 2.5,
                  p: 2,
                  minHeight: 400,
                }}
              >
                {/* Column header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{col.label}</Typography>
                  <Chip label={items.length} size="small" sx={{ fontWeight: 700 }} />
                </Box>

                {/* Cards */}
                {items.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    주문 없음
                  </Typography>
                )}

                {items.map((order) => (
                  <Card
                    key={order.id}
                    variant="outlined"
                    sx={{
                      mb: 1.5,
                      borderRadius: 2,
                      borderColor: 'rgba(17,17,17,0.06)',
                    }}
                  >
                    <CardContent sx={{ pb: '12px !important' }}>
                      {/* Time + party */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime fontSize="small" sx={{ color: BRAND_DARK }} />
                          <Typography variant="body2" fontWeight={700}>
                            {formatTime(order.reservation_time)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Group fontSize="small" />
                          <Typography variant="body2">{order.party_size}명</Typography>
                        </Box>
                      </Box>

                      {/* Customer */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <Person fontSize="small" />
                        <Typography variant="body2">{order.customer_name}</Typography>
                      </Box>

                      <Divider sx={{ mb: 1 }} />

                      {/* Menu items */}
                      {order.order_items?.map((item, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">
                          {item.name} x {item.quantity}
                        </Typography>
                      ))}

                      {/* Estimated prep end time */}
                      {(order.cooking_status === 'preparing' || order.cooking_status === 'cooking') && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#E65100' }}>
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
                            sx={{
                              flex: 1,
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
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
                            endIcon={<ArrowForward />}
                            sx={{
                              flex: 1,
                              bgcolor: BRAND,
                              '&:hover': { bgcolor: BRAND_DARK },
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
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
                    bgcolor: '#FFF3E0',
                    '&:hover': { bgcolor: '#FFE0B2' },
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
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ color: '#666' }}>
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
