import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import apiClient from '../utils/api';
import { SETTLEMENT_STATUS, resolveStatus } from '../theme';
import { PageHeader, StatCard, SectionCard, StatusChip, LoadingSkeleton, EmptyState } from './common';

// ── Types ──────────────────────────────────────────────────────
interface Settlement {
  id: number;
  restaurant_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  platform_fee: number;
  payment_fee: number;
  settlement_amount: number;
  order_count: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface SettlementItem {
  id: number;
  order_id: string;
  reservation_id: string;
  order_amount: number;
  platform_fee: number;
  payment_fee: number;
  net_amount: number;
  order_date: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
}

interface Summary {
  total_sales: number;
  total_platform_fee: number;
  total_payment_fee: number;
  total_settlement: number;
  total_orders: number;
  settlement_count: number;
}

// ── Helpers ────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (amount: number) => {
  return (amount || 0).toLocaleString('ko-KR') + '원';
};

// 상태 라벨/색은 중앙 테마(SETTLEMENT_STATUS)에서 해석 (StatusChip / resolveStatus)

// CSV 셀 값 이스케이프: 콤마/따옴표/줄바꿈 포함 시 따옴표로 감싸고 내부 따옴표는 두 번
const csvEscape = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0);
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    options.push({
      label: `${year}년 ${month}월`,
      value: `${start}|${endStr}`,
      start,
      end: endStr,
    });
  }
  return options;
};

// ── Component ──────────────────────────────────────────────────
const SettlementHistory: React.FC = () => {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_sales: 0,
    total_platform_fee: 0,
    total_payment_fee: 0,
    total_settlement: 0,
    total_orders: 0,
    settlement_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSettlement, setDetailSettlement] = useState<Settlement | null>(null);
  const [detailItems, setDetailItems] = useState<SettlementItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const getDateRange = () => {
    const [start, end] = selectedMonth.split('|');
    return { start, end };
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const { start, end } = getDateRange();

    try {
      const [listRes, summaryRes] = await Promise.all([
        apiClient.get('/api/settlements/merchant', {
          params: { period_start: start, period_end: end, limit: 100 },
        }),
        apiClient.get('/api/settlements/merchant/summary', {
          params: { period_start: start, period_end: end },
        }),
      ]);

      const listData = listRes.data.data || listRes.data;
      setSettlements(listData.settlements || (Array.isArray(listData) ? listData : []));

      const summaryData = summaryRes.data.data || summaryRes.data;
      setSummary({
        total_sales: summaryData.total_sales || 0,
        total_platform_fee: summaryData.total_platform_fee || 0,
        total_payment_fee: summaryData.total_payment_fee || 0,
        total_settlement: summaryData.total_settlement || 0,
        total_orders: summaryData.total_orders || 0,
        settlement_count: summaryData.settlement_count || 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '정산 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (settlement: Settlement) => {
    setDetailSettlement(settlement);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailItems([]);

    try {
      const res = await apiClient.get(`/api/settlements/merchant/${settlement.id}`);
      const d = res.data.data || res.data;
      setDetailItems(d.items || []);
    } catch (err: any) {
      setError(err.response?.data?.error || '정산 상세를 불러오는데 실패했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── CSV 내보내기 ──
  const handleExportCsv = () => {
    if (settlements.length === 0) return;

    const headers = [
      '기간시작', '기간끝', '주문수', '총매출',
      '플랫폼수수료', '결제수수료', '정산금액', '상태', '지급일',
    ];
    const rows = settlements.map((s) => [
      formatDate(s.period_start),
      formatDate(s.period_end),
      s.order_count ?? 0,
      s.total_sales ?? 0,
      s.platform_fee ?? 0,
      s.payment_fee ?? 0,
      s.settlement_amount ?? 0,
      resolveStatus(SETTLEMENT_STATUS, s.status).label,
      s.paid_at ? formatDate(s.paid_at) : '',
    ]);

    const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(','));
    // BOM(﻿) 선두로 추가해 Excel에서 한글 깨짐 방지
    const csvContent = '﻿' + lines.join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const { start, end } = getDateRange();
    const a = document.createElement('a');
    a.href = url;
    a.download = `정산내역_${start}_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <PageHeader title="정산 내역" />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 기간 선택 (월별) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 8 }}>
              <FormControl fullWidth>
                <InputLabel>정산 기간</InputLabel>
                <Select
                  value={selectedMonth}
                  label="정산 기간"
                  onChange={(e) => setSelectedMonth(e.target.value as string)}
                >
                  {monthOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<SearchIcon />}
                onClick={fetchData}
                disabled={loading}
                sx={{ py: 1.8 }}
              >
                조회
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 정산 요약 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="총 주문금액" value={formatCurrency(summary.total_sales)} color="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="플랫폼 수수료 (5%)" value={formatCurrency(summary.total_platform_fee)} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="결제 수수료 (3%)" value={formatCurrency(summary.total_payment_fee)} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="순정산금액" value={formatCurrency(summary.total_settlement)} color="info" />
        </Grid>
      </Grid>

      {/* 정산 목록 테이블 */}
      <SectionCard
        title={`정산 목록 (${summary.settlement_count}건)`}
        noPadding
        action={
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={settlements.length === 0}
          >
            CSV 내보내기
          </Button>
        }
      >
        {loading ? (
          <LoadingSkeleton variant="table" columns={7} />
        ) : settlements.length === 0 ? (
          <EmptyState
            icon={<ReceiptLongIcon />}
            title="해당 기간의 정산 내역이 없습니다"
            description="다른 기간을 선택해보세요."
          />
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>정산 기간</TableCell>
                  <TableCell align="center">주문 수</TableCell>
                  <TableCell align="right">매출</TableCell>
                  <TableCell align="right">수수료</TableCell>
                  <TableCell align="right">정산금</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell align="center">상세</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settlements.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      {formatDate(s.period_start)} ~ {formatDate(s.period_end)}
                    </TableCell>
                    <TableCell align="center">{s.order_count}건</TableCell>
                    <TableCell align="right">{formatCurrency(s.total_sales)}</TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      {formatCurrency(s.platform_fee + s.payment_fee)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {formatCurrency(s.settlement_amount)}
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip status={s.status} map={SETTLEMENT_STATUS} variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openDetail(s)} color="primary">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {/* 정산 상세 다이얼로그 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="span">정산 상세</Typography>
            {detailSettlement && (
              <Typography variant="body2" color="text.secondary">
                {formatDate(detailSettlement.period_start)} ~ {formatDate(detailSettlement.period_end)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailSettlement && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">총 매출</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(detailSettlement.total_sales)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">총 수수료</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {formatCurrency(detailSettlement.platform_fee + detailSettlement.payment_fee)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">정산금</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {formatCurrency(detailSettlement.settlement_amount)}
                </Typography>
              </Grid>
            </Grid>
          )}

          {detailLoading ? (
            <LoadingSkeleton variant="table" columns={7} />
          ) : detailItems.length === 0 ? (
            <EmptyState icon={<ReceiptLongIcon />} title="상세 항목이 없습니다" dense />
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell align="center">인원</TableCell>
                    <TableCell align="right">주문금액</TableCell>
                    <TableCell align="right">플랫폼 수수료</TableCell>
                    <TableCell align="right">결제 수수료</TableCell>
                    <TableCell align="right">순수익</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{formatDate(item.reservation_date || item.order_date)}</TableCell>
                      <TableCell>{item.customer_name || '-'}</TableCell>
                      <TableCell align="center">{item.party_size || '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(item.order_amount)}</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(item.platform_fee)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(item.payment_fee)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {formatCurrency(item.net_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} color="inherit">닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettlementHistory;
