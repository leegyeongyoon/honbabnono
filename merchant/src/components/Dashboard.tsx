import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import EventIcon from '@mui/icons-material/Event';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import apiClient from '../utils/api';

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

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, []);

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
    (a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime()
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
                      const time = format(new Date(reservation.reservation_time), 'HH:mm');
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
    </Box>
  );
};

export default Dashboard;
