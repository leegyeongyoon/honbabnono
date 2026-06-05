import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
  Card,
  Grid,
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
import { PAYMENT_STATUS } from '../theme';
import { won, formatDate, formatDateTime } from '../utils/format';
import { PageHeader, EmptyState, StatCard, LoadingSkeleton, StatusChip, ResponsiveTableContainer } from './common';

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

const METHOD_LABELS: Record<string, string> = {
  card: '카드',
  points: '포인트',
  kakao: '카카오페이',
  toss: '토스',
};

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

  const partialInvalid =
    refundType === 'partial' &&
    dialogTarget != null &&
    (!refundAmount ||
      Number(refundAmount) <= 0 ||
      Number(refundAmount) > refundableBalance(dialogTarget));

  return (
    <Box>
      <PageHeader title="결제 관리" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard label="총 결제액" value={won(totals.paid_amount)} icon={<PaymentsIcon />} color="success" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard label="총 환불액" value={won(totals.refunded_amount)} icon={<MoneyOffIcon />} color="error" />
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
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
          <Button variant="outlined" color="primary" onClick={fetchPayments}>
            조회
          </Button>
          {(periodStart || periodEnd) && (
            <Button
              variant="text"
              color="inherit"
              onClick={() => { setPeriodStart(''); setPeriodEnd(''); }}
            >
              초기화
            </Button>
          )}
        </Box>

        {loading ? (
          <LoadingSkeleton variant="table" columns={9} />
        ) : payments.length === 0 ? (
          <EmptyState icon={<PaymentsIcon />} title="결제 내역이 없습니다." />
        ) : (
          <ResponsiveTableContainer minWidth={960}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>고객</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>매장</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>예약일</TableCell>
                  <TableCell align="right">금액</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>수단</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>결제일</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>환불액</TableCell>
                  <TableCell align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => {
                  const refundable = ['paid', 'partial_refund'].includes(p.status) && refundableBalance(p) > 0;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.customer_name || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.customer_email || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{p.restaurant_name || '-'}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2">{formatDate(p.reservation_date)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.reservation_time ? String(p.reservation_time).slice(0, 5) : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{won(p.amount)}</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Chip label={METHOD_LABELS[p.payment_method] || p.payment_method} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <StatusChip status={p.status} map={PAYMENT_STATUS} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2">{formatDateTime(p.paid_at)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
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
          </ResponsiveTableContainer>
        )}
      </Card>

      {/* Refund dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>환불 처리</DialogTitle>
        <DialogContent>
          {dialogTarget && (
            <Box>
              <Box sx={{ backgroundColor: 'background.default', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="body2"><strong>고객:</strong> {dialogTarget.customer_name}</Typography>
                <Typography variant="body2"><strong>매장:</strong> {dialogTarget.restaurant_name || '-'}</Typography>
                <Typography variant="body2"><strong>결제 금액:</strong> {won(dialogTarget.amount)}</Typography>
                {Number(dialogTarget.refund_amount) > 0 && (
                  <Typography variant="body2"><strong>기존 환불액:</strong> {won(dialogTarget.refund_amount)}</Typography>
                )}
                <Typography variant="body2" component="div">
                  <strong>환불 가능 잔액:</strong>{' '}
                  <Box component="strong" sx={{ color: 'error.main' }}>{won(refundableBalance(dialogTarget))}</Box>
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
