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
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PaidIcon from '@mui/icons-material/Paid';
import apiClient from '../utils/api';
import { SETTLEMENT_STATUS } from '../theme';
import { won, formatDate, formatDateTime } from '../utils/format';
import { PageHeader, EmptyState, StatCard, LoadingSkeleton, StatusChip, ResponsiveTableContainer } from './common';

interface Settlement {
  id: string;
  restaurant_id: string;
  merchant_id: string | null;
  restaurant_name?: string;
  owner_name?: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  platform_fee: number;
  payment_fee: number;
  settlement_amount: number;
  fee_rate: number;
  payment_fee_rate: number;
  order_count: number;
  status: 'pending' | 'paid';
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
  paid_at?: string | null;
  created_at: string;
}

interface Counts {
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
}

const SettlementManagement: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0); // 0=전체, 1=대기, 2=지급완료
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<Settlement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const statusFilter = ['all', 'pending', 'paid'][tabIndex];

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { status: statusFilter, limit: '100' };
      const res: any = await apiClient.get('/api/admin/settlements', { params });
      setSettlements(res.data.settlements || []);
      setCounts(res.data.counts || { pending: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 } });
    } catch (err: any) {
      setError(err.response?.data?.error || '정산 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const openPayDialog = (settlement: Settlement) => {
    setDialogTarget(settlement);
    setDialogOpen(true);
  };

  const handlePay = async () => {
    if (!dialogTarget) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/api/admin/settlements/${dialogTarget.id}/pay`);
      setSnackbar({ open: true, message: '정산이 지급 처리되었습니다.', severity: 'success' });
      setDialogOpen(false);
      fetchSettlements();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || '지급 처리에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader title="정산 관리" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="대기 건수" value={counts.pending.count} icon={<HourglassEmptyIcon />} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="대기 정산액" value={won(counts.pending.amount)} icon={<AccountBalanceIcon />} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard label="지급완료 건수" value={counts.paid.count} icon={<PaidIcon />} color="success" />
        </Grid>
      </Grid>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
            <Tab label="전체" />
            <Tab label={`대기 (${counts.pending.count})`} />
            <Tab label={`지급완료 (${counts.paid.count})`} />
          </Tabs>
        </Box>

        {loading ? (
          <LoadingSkeleton variant="table" columns={10} />
        ) : settlements.length === 0 ? (
          <EmptyState icon={<AccountBalanceIcon />} title="정산 내역이 없습니다." />
        ) : (
          <ResponsiveTableContainer minWidth={1040}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>매장</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>점주</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>정산 기간</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>총매출</TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>수수료</TableCell>
                  <TableCell align="right">정산액</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>정산 계좌</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>지급일</TableCell>
                  <TableCell align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settlements.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.restaurant_name || '-'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{s.owner_name || '-'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">
                        {formatDate(s.period_start)} ~ {formatDate(s.period_end)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        주문 {s.order_count}건
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{won(s.total_sales)}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{won(Number(s.platform_fee) + Number(s.payment_fee))}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        플랫폼 {won(s.platform_fee)} / 결제 {won(s.payment_fee)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {won(s.settlement_amount)}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {s.bank_name ? (
                        <Box>
                          <Typography variant="body2">{s.bank_name} {s.bank_account}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.bank_holder}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">미등록</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip status={s.status} map={SETTLEMENT_STATUS} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{formatDateTime(s.paid_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {s.status === 'pending' ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => openPayDialog(s)}
                        >
                          지급 처리
                        </Button>
                      ) : (
                        <Typography variant="body2" color="success.main">완료</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Card>

      {/* Pay confirm dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>정산 지급 확인</DialogTitle>
        <DialogContent>
          {dialogTarget && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                아래 계좌로 정산액을 지급 처리하시겠습니까? 지급 처리 후에는 되돌릴 수 없습니다.
              </Typography>
              <Box sx={{ backgroundColor: 'background.default', borderRadius: 2, p: 2, mb: 1 }}>
                <Typography variant="body2"><strong>매장:</strong> {dialogTarget.restaurant_name || '-'}</Typography>
                <Typography variant="body2"><strong>점주:</strong> {dialogTarget.owner_name || '-'}</Typography>
                <Typography variant="body2" component="div"><strong>정산액:</strong> <Box component="strong" sx={{ color: 'success.main' }}>{won(dialogTarget.settlement_amount)}</Box></Typography>
              </Box>
              <Box sx={{ border: '2px solid', borderColor: 'primary.main', borderRadius: 2, p: 2, backgroundColor: 'background.default' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>입금 계좌</Typography>
                {dialogTarget.bank_name ? (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {dialogTarget.bank_name} {dialogTarget.bank_account}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      예금주: {dialogTarget.bank_holder}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error">정산 계좌가 등록되어 있지 않습니다.</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>취소</Button>
          <Button onClick={handlePay} variant="contained" color="success" disabled={submitting}>
            {submitting ? '처리 중...' : '지급 처리'}
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

export default SettlementManagement;
