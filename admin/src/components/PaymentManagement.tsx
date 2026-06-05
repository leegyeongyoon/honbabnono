import React, { useEffect, useState, useCallback } from 'react';
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
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import apiClient from '../utils/api';

interface Payment {
  id: string;
  reservation_id: string | null;
  order_id: string | null;
  user_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'paid' | 'refunded' | 'partial_refund';
  merchant_uid?: string;
  refund_amount?: number;
  refund_rate?: number;
  refund_reason?: string;
  paid_at?: string | null;
  refunded_at?: string | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  restaurant_name?: string;
  reservation_date?: string;
  reservation_time?: string;
}

interface Totals {
  paid_amount: number;
  refunded_amount: number;
}

const STATUS_CHIPS: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  pending: { label: '대기', color: 'warning' },
  paid: { label: '결제완료', color: 'success' },
  refunded: { label: '환불완료', color: 'error' },
  partial_refund: { label: '부분환불', color: 'info' },
};

const METHOD_LABELS: Record<string, string> = {
  card: '카드',
  points: '포인트',
  kakao: '카카오페이',
  toss: '토스',
};

const won = (n: number | undefined) => `₩${Number(n ?? 0).toLocaleString('ko-KR')}`;

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState<Totals>({ paid_amount: 0, refunded_amount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0); // 0=전체, 1=paid, 2=refunded, 3=partial_refund
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Refund dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<Payment | null>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusFilter = ['all', 'paid', 'refunded', 'partial_refund'][tabIndex];

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { status: statusFilter, limit: '100' };
      if (periodStart) params.period_start = periodStart;
      if (periodEnd) params.period_end = periodEnd;
      const res: any = await apiClient.get('/api/admin/payments', { params });
      setPayments(res.data.payments || []);
      setTotals(res.data.totals || { paid_amount: 0, refunded_amount: 0 });
    } catch (err: any) {
      setError(err.response?.data?.error || '결제 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodStart, periodEnd]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const refundableBalance = (p: Payment) => Number(p.amount) - (Number(p.refund_amount) || 0);

  const openRefundDialog = (payment: Payment) => {
    setDialogTarget(payment);
    setRefundType('full');
    setRefundAmount('');
    setRefundReason('');
    setDialogOpen(true);
  };

  const handleRefund = async () => {
    if (!dialogTarget) return;
    if (!refundReason.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string | number> = { reason: refundReason.trim() };
      if (refundType === 'partial') {
        payload.amount = Number(refundAmount);
      }
      await apiClient.post(`/api/admin/payments/${dialogTarget.id}/refund`, payload);
      setSnackbar({ open: true, message: '환불이 처리되었습니다.', severity: 'success' });
      setDialogOpen(false);
      fetchPayments();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || '환불 처리에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const partialInvalid =
    refundType === 'partial' &&
    dialogTarget != null &&
    (!refundAmount ||
      Number(refundAmount) <= 0 ||
      Number(refundAmount) > refundableBalance(dialogTarget));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        결제 관리
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '총 결제액', value: won(totals.paid_amount), icon: <PaymentsIcon />, color: '#2E7D32' },
          { label: '총 환불액', value: won(totals.refunded_amount), icon: <MoneyOffIcon />, color: '#D32F2F' },
        ].map((item) => (
          <Grid size={{ xs: 12, md: 6 }} key={item.label}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Box sx={{ color: item.color }}>{item.icon}</Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{item.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              '& .MuiTab-root': { fontWeight: 600 },
              '& .Mui-selected': { color: '#C9B59C' },
              '& .MuiTabs-indicator': { backgroundColor: '#C9B59C' },
            }}
          >
            <Tab label="전체" />
            <Tab label="결제완료" />
            <Tab label="환불완료" />
            <Tab label="부분환불" />
          </Tabs>
        </Box>

        {/* Period filter */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="date"
            label="시작일"
            InputLabelProps={{ shrink: true }}
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="종료일"
            InputLabelProps={{ shrink: true }}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
          <Button variant="outlined" onClick={fetchPayments} sx={{ borderColor: '#C9B59C', color: '#A08B7A' }}>
            조회
          </Button>
          {(periodStart || periodEnd) && (
            <Button
              variant="text"
              onClick={() => { setPeriodStart(''); setPeriodEnd(''); }}
              sx={{ color: '#999' }}
            >
              초기화
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#C9B59C' }} />
          </Box>
        ) : payments.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            결제 내역이 없습니다.
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F9F8F6' }}>
                  <TableCell sx={{ fontWeight: 600 }}>고객</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>매장</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>예약일</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">금액</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">수단</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">상태</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>결제일</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">환불액</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => {
                  const statusCfg = STATUS_CHIPS[p.status] || { label: p.status, color: 'default' as const };
                  const refundable = ['paid', 'partial_refund'].includes(p.status) && refundableBalance(p) > 0;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.customer_name || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.customer_email || ''}</Typography>
                      </TableCell>
                      <TableCell>{p.restaurant_name || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(p.reservation_date)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.reservation_time ? String(p.reservation_time).slice(0, 5) : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{won(p.amount)}</TableCell>
                      <TableCell align="center">
                        <Chip label={METHOD_LABELS[p.payment_method] || p.payment_method} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDateTime(p.paid_at)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {Number(p.refund_amount) > 0 ? (
                          <Typography variant="body2" color="error.main">{won(p.refund_amount)}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {refundable ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => openRefundDialog(p)}
                          >
                            환불
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Refund dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>환불 처리</DialogTitle>
        <DialogContent>
          {dialogTarget && (
            <Box>
              <Box sx={{ backgroundColor: '#F9F8F6', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="body2"><strong>고객:</strong> {dialogTarget.customer_name}</Typography>
                <Typography variant="body2"><strong>매장:</strong> {dialogTarget.restaurant_name || '-'}</Typography>
                <Typography variant="body2"><strong>결제 금액:</strong> {won(dialogTarget.amount)}</Typography>
                {Number(dialogTarget.refund_amount) > 0 && (
                  <Typography variant="body2"><strong>기존 환불액:</strong> {won(dialogTarget.refund_amount)}</Typography>
                )}
                <Typography variant="body2">
                  <strong>환불 가능 잔액:</strong>{' '}
                  <strong style={{ color: '#D32F2F' }}>{won(refundableBalance(dialogTarget))}</strong>
                </Typography>
              </Box>

              <FormLabel sx={{ fontSize: 14, fontWeight: 600 }}>환불 유형</FormLabel>
              <RadioGroup
                row
                value={refundType}
                onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                sx={{ mb: 1 }}
              >
                <FormControlLabel value="full" control={<Radio />} label="전액 환불 (잔액 전체)" />
                <FormControlLabel value="partial" control={<Radio />} label="부분 환불" />
              </RadioGroup>

              {refundType === 'partial' && (
                <TextField
                  fullWidth
                  type="number"
                  label="환불 금액"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  error={partialInvalid}
                  helperText={partialInvalid ? `1원 이상 ${refundableBalance(dialogTarget).toLocaleString('ko-KR')}원 이하로 입력하세요.` : ''}
                  sx={{ mb: 2 }}
                />
              )}

              <TextField
                fullWidth
                required
                label="환불 사유"
                placeholder="환불 사유를 입력해주세요."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                multiline
                rows={2}
                sx={{ mt: refundType === 'partial' ? 0 : 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>취소</Button>
          <Button
            onClick={handleRefund}
            variant="contained"
            color="error"
            disabled={submitting || !refundReason.trim() || partialInvalid}
          >
            {submitting ? '처리 중...' : '환불 처리'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentManagement;
