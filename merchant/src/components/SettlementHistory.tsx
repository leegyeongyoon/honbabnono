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
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../utils/api';

const COMMISSION_RATE = 0.05;

interface Reservation {
  id: number;
  reservation_date: string;
  reservation_time: string;
  user_name: string;
  party_size: number;
  special_request: string;
  total_amount?: number;
  orders?: Array<{ total_amount: number; menu_name?: string }>;
}

interface Summary {
  totalCount: number;
  totalRevenue: number;
  commission: number;
  settlement: number;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('ko-KR') + '원';
};

const getDefaultDateRange = () => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  return { start, end };
};

const SettlementHistory: React.FC = () => {
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo, setDateTo] = useState(defaultRange.end);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCount: 0, totalRevenue: 0, commission: 0, settlement: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/api/reservations/merchant', { params });
      const data = res.data.reservations || res.data || [];

      // completed 상태만 필터 (날짜 범위 필터는 서버에서 처리하지 않을 수 있으므로 클라이언트에서도 필터)
      const filtered = data.filter((r: any) => {
        const isCompleted = r.status === 'completed';
        const date = r.reservation_date?.split('T')[0] || r.reservation_date;
        const inRange = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
        return isCompleted && inRange;
      });

      setReservations(filtered);

      // 집계 계산
      const totalRevenue = filtered.reduce((sum: number, r: any) => {
        const orderTotal = r.orders
          ? r.orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
          : (r.total_amount || 0);
        return sum + orderTotal;
      }, 0);

      const commission = Math.round(totalRevenue * COMMISSION_RATE);
      setSummary({
        totalCount: filtered.length,
        totalRevenue,
        commission,
        settlement: totalRevenue - commission,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '정산 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getReservationAmount = (r: Reservation) => {
    if (r.orders && r.orders.length > 0) {
      return r.orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    }
    return r.total_amount || 0;
  };

  const getMenuSummary = (r: Reservation) => {
    if (r.orders && r.orders.length > 0) {
      return r.orders.map((o) => o.menu_name || '-').join(', ');
    }
    return '-';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        정산 내역
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 기간 선택 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="시작일"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="종료일"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={fetchSettlements}
                disabled={loading}
                sx={{
                  py: 1.8,
                  background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                }}
              >
                조회
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 집계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '총 예약 건수', value: `${summary.totalCount}건`, color: '#C4A08A' },
          { label: '총 매출', value: formatCurrency(summary.totalRevenue), color: '#2E7D4F' },
          { label: '예상 수수료 (5%)', value: formatCurrency(summary.commission), color: '#E69100' },
          { label: '예상 정산액', value: formatCurrency(summary.settlement), color: '#1976D2' },
        ].map((item) => (
          <Grid item xs={6} md={3} key={item.label}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: item.color }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 상세 테이블 */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="h6" sx={{ p: 3, pb: 1 }}>
            예약별 상세 내역
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#C4A08A' }} />
            </Box>
          ) : reservations.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              해당 기간의 완료된 예약이 없습니다.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#FAF6F3' }}>
                    <TableCell sx={{ fontWeight: 600 }}>날짜</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>시간</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>고객명</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">인원</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>메뉴</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">결제금액</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{formatDate(r.reservation_date)}</TableCell>
                      <TableCell>{r.reservation_time || '-'}</TableCell>
                      <TableCell>{r.user_name || '-'}</TableCell>
                      <TableCell align="center">{r.party_size || '-'}</TableCell>
                      <TableCell>{getMenuSummary(r)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(getReservationAmount(r))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettlementHistory;
