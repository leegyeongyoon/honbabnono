import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import apiClient from '../utils/api';
import { formatReservationTime } from '../utils/formatTime';

interface Reservation {
  id: number;
  reservation_time: string;
  customer_name: string;
  party_size: number;
  menu_name?: string;
  arrival_status?: string;
  status: string;
}

interface Order {
  id: number;
  order_number?: string;
  customer_name?: string;
  total_amount: number;
  cooking_status: string;
  created_at: string;
}

interface DailyStat {
  date: string;
  sales: number;
  reservations: number;
}

interface TopMenu {
  menu_name: string;
  qty: number;
  sales: number;
}

interface SalesStats {
  period: string;
  total_sales: number;
  total_reservations: number;
  daily: DailyStat[];
  top_menus: TopMenu[];
}

type StatsPeriod = '7d' | '30d';

const statusConfig: Record<string, { label: string; color: 'primary' | 'warning' | 'success' | 'secondary' | 'default' | 'info' | 'error' }> = {
  confirmed: { label: '확정', color: 'info' },
  preparing: { label: '준비 중', color: 'warning' },
  ready: { label: '준비 완료', color: 'success' },
  seated: { label: '착석', color: 'secondary' },
  completed: { label: '완료', color: 'default' },
  cancelled: { label: '취소', color: 'error' },
  pending: { label: '대기', color: 'default' },
};

const cookingStatusConfig: Record<string, { label: string; color: 'primary' | 'warning' | 'success' | 'default' | 'info' | 'error' }> = {
  pending: { label: '접수', color: 'default' },
  cooking: { label: '조리 중', color: 'warning' },
  ready: { label: '조리 완료', color: 'success' },
  served: { label: '서빙 완료', color: 'info' },
  cancelled: { label: '취소', color: 'error' },
};

const Dashboard: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 매출 통계
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('7d');
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadStats(statsPeriod);
  }, [statsPeriod]);

  const loadStats = async (period: StatsPeriod) => {
    setStatsLoading(true);
    try {
      const res = await apiClient.get('/api/settlements/merchant/stats', { params: { period } });
      const d = res.data.data || res.data;
      setStats({
        period: d.period || period,
        total_sales: d.total_sales || 0,
        total_reservations: d.total_reservations || 0,
        daily: Array.isArray(d.daily) ? d.daily : [],
        top_menus: Array.isArray(d.top_menus) ? d.top_menus : [],
      });
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [reservationRes, orderRes] = await Promise.allSettled([
        apiClient.get(`/api/reservations/merchant?date=${today}`),
        apiClient.get('/api/orders/merchant?limit=5'),
      ]);

      if (reservationRes.status === 'fulfilled') {
        const raw = reservationRes.value.data;
        const data = raw.data || raw;
        setReservations(Array.isArray(data) ? data : data.reservations || []);
      }

      if (orderRes.status === 'fulfilled') {
        const raw = orderRes.value.data;
        const data = raw.data || raw;
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }

      if (reservationRes.status === 'rejected' && orderRes.status === 'rejected') {
        setError('데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const summary = {
    total: reservations.length,
    expectedRevenue: reservations
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => sum + (r.party_size || 0) * 15000, 0),
    completed: reservations.filter((r) => r.status === 'completed').length,
    noShow: reservations.filter((r) => r.arrival_status === 'no_show').length,
  };

  const sortedReservations = [...reservations].sort(
    (a, b) => (a.reservation_time || '').localeCompare(b.reservation_time || '')
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#C4A08A' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {format(new Date(), 'yyyy년 MM월 dd일')} 현황
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 오늘 요약 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventIcon sx={{ fontSize: 32, color: '#C4A08A', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                오늘 예약
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoneyIcon sx={{ fontSize: 32, color: '#2E7D4F', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary.expectedRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                예상 매출 (원)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#1976D2', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CancelIcon sx={{ fontSize: 32, color: '#D32F2F', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {summary.noShow}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                노쇼
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 오늘의 예약 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                오늘의 예약
              </Typography>
              {sortedReservations.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  오늘 예약이 없습니다.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>시간</TableCell>
                      <TableCell>고객명</TableCell>
                      <TableCell align="center">인원</TableCell>
                      <TableCell>메뉴</TableCell>
                      <TableCell align="center">도착</TableCell>
                      <TableCell align="center">상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedReservations.map((reservation) => {
                      const time = formatReservationTime(reservation.reservation_time);
                      const status = statusConfig[reservation.status] || { label: reservation.status, color: 'default' as const };
                      return (
                        <TableRow key={reservation.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{time}</TableCell>
                          <TableCell>{reservation.customer_name || '-'}</TableCell>
                          <TableCell align="center">{reservation.party_size}명</TableCell>
                          <TableCell>{reservation.menu_name || '-'}</TableCell>
                          <TableCell align="center">
                            {reservation.arrival_status === 'arrived' ? (
                              <Chip label="도착" size="small" color="success" variant="outlined" />
                            ) : reservation.arrival_status === 'no_show' ? (
                              <Chip label="노쇼" size="small" color="error" variant="outlined" />
                            ) : (
                              <Chip label="대기" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={status.label} size="small" color={status.color} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 주문 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                최근 주문
              </Typography>
              {orders.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  최근 주문이 없습니다.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>주문번호</TableCell>
                      <TableCell align="right">금액</TableCell>
                      <TableCell align="center">상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.slice(0, 5).map((order) => {
                      const cookingStatus = cookingStatusConfig[order.cooking_status] || {
                        label: order.cooking_status || '-',
                        color: 'default' as const,
                      };
                      return (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {order.order_number || `#${order.id}`}
                          </TableCell>
                          <TableCell align="right">
                            {order.total_amount?.toLocaleString() || 0}원
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={cookingStatus.label} size="small" color={cookingStatus.color} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 매출 통계 */}
      <Paper sx={{ mt: 3, p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">매출 통계</Typography>
          <ToggleButtonGroup
            value={statsPeriod}
            exclusive
            size="small"
            onChange={(_e, val) => { if (val) setStatsPeriod(val); }}
          >
            <ToggleButton value="7d">최근 7일</ToggleButton>
            <ToggleButton value="30d">최근 30일</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {statsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#C4A08A' }} />
          </Box>
        ) : !stats ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            통계 데이터를 불러올 수 없습니다.
          </Typography>
        ) : (
          <>
            {/* 요약 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FAF6F3', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">총 매출</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D4F' }}>
                    {stats.total_sales.toLocaleString()}원
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FAF6F3', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">총 예약</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976D2' }}>
                    {stats.total_reservations.toLocaleString()}건
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* 일별 매출 바 차트 (CSS) */}
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>일별 매출</Typography>
            {stats.daily.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                데이터가 없습니다.
              </Typography>
            ) : (
              (() => {
                const maxSales = Math.max(1, ...stats.daily.map((d) => d.sales || 0));
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 0.75,
                      height: 180,
                      overflowX: 'auto',
                      pb: 1,
                    }}
                  >
                    {stats.daily.map((d) => {
                      const heightPct = maxSales > 0 ? (d.sales / maxSales) * 100 : 0;
                      const mmdd = d.date ? d.date.slice(5).replace('-', '/') : '-';
                      return (
                        <Box
                          key={d.date}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flex: '1 0 auto',
                            minWidth: 36,
                            height: '100%',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: 10, color: '#666', mb: 0.5, whiteSpace: 'nowrap' }}>
                            {d.sales > 0 ? `${Math.round(d.sales / 1000)}k` : ''}
                          </Typography>
                          <Box
                            title={`${mmdd}: ${(d.sales || 0).toLocaleString()}원`}
                            sx={{
                              width: '70%',
                              minHeight: d.sales > 0 ? 2 : 0,
                              height: `${heightPct}%`,
                              bgcolor: '#C4A08A',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s',
                            }}
                          />
                          <Typography variant="caption" sx={{ fontSize: 10, color: '#999', mt: 0.5, whiteSpace: 'nowrap' }}>
                            {mmdd}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })()
            )}

            {/* 인기 메뉴 TOP5 */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, fontWeight: 600 }}>인기 메뉴 TOP5</Typography>
            {stats.top_menus.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                데이터가 없습니다.
              </Typography>
            ) : (
              <Box>
                {stats.top_menus.slice(0, 5).map((m, i) => (
                  <Box
                    key={`${m.menu_name}-${i}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: i < Math.min(stats.top_menus.length, 5) - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Chip label={i + 1} size="small" sx={{ bgcolor: '#C4A08A', color: '#fff', fontWeight: 700, width: 28 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {m.menu_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        x{m.qty}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2E7D4F', whiteSpace: 'nowrap', ml: 1 }}>
                      {(m.sales || 0).toLocaleString()}원
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
