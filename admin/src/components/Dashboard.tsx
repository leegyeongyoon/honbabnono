import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Snackbar,
  Collapse,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import apiClient from '../utils/api';
import { brand } from '../theme';
import { won, num } from '../utils/format';
import { PageHeader, StatCard, LoadingSkeleton, EmptyState } from './common';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface DashboardStats {
  total_users: number;
  today_users: number;
  week_users: number;
  total_meetups: number;
  today_meetups: number;
  active_meetups: number;
  completed_meetups: number;
  total_reviews: number;
  avg_rating: number;
  pending_reports: number;
  pending_support: number;
  active_deposits: number;
  total_deposit_amount: number;
  total_revenue: number;
  total_badges_awarded: number;
  active_ads: number;
  // v2 피벗
  today_reservations: number;
  week_reservations: number;
  gmv_total: number;
  gmv_week: number;
  active_restaurants: number;
  noshow_rate: number | null;
}

interface TopRestaurant {
  id: string;
  name: string;
  sales: number;
  reservation_count: number;
}

interface TrendItem {
  date: string;
  new_users: number;
  new_meetups: number;
  completed_meetups: number;
  new_reviews: number;
}

interface RealtimeStats {
  total_users: number;
  new_users_hour: number;
  active_users_day: number;
  total_meetups: number;
  active_meetups: number;
  new_meetups_hour: number;
  total_chat_rooms: number;
  active_chat_rooms: number;
  total_revenue: number;
  total_ads: number;
  active_ads: number;
  total_points: number;
  pending_deposits: number;
  pending_reports: number;
  pending_support: number;
  systemHealth: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchDashboardData = useCallback(async (days: string) => {
    try {
      setLoading(true);

      const [dashboardRes, realtimeRes] = await Promise.all([
        apiClient.get(`/api/admin/dashboard/stats?days=${days}`),
        apiClient.get(`/api/admin/realtime-stats`),
      ]);

      const dashData = dashboardRes.data as any;
      const rtData = realtimeRes.data as any;

      setStats(dashData.stats || null);
      setTrends(dashData.trends || []);
      setTopRestaurants(dashData.topRestaurants || []);
      setRealtimeData(rtData.data || null);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '대시보드 데이터를 불러오는데 실패했습니다.');
      setSnackbar({
        open: true,
        message: '데이터 새로고침 실패',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(dateRange);
    const interval = setInterval(() => {
      fetchDashboardData(dateRange);
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange, fetchDashboardData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const userGrowthData = {
    labels: trends.map(item => format(new Date(item.date), 'MM/dd')),
    datasets: [
      {
        label: '신규 사용자',
        data: trends.map(item => item.new_users),
        borderColor: brand[400],
        backgroundColor: 'rgba(201, 181, 156, 0.2)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '신규 리뷰',
        data: trends.map(item => item.new_reviews),
        borderColor: brand[600],
        backgroundColor: 'rgba(160, 139, 122, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const meetupActivityData = {
    labels: trends.map(item => format(new Date(item.date), 'MM/dd')),
    datasets: [
      {
        label: '신규 모임',
        data: trends.map(item => item.new_meetups),
        backgroundColor: 'rgba(201, 181, 156, 0.7)',
      },
      {
        label: '완료 모임',
        data: trends.map(item => item.completed_meetups),
        backgroundColor: 'rgba(160, 139, 122, 0.7)',
      },
    ],
  };

  // 밥알점수 분포 — brand 스케일(상위) + 양끝 success/error로 의미 부여
  const babalScoreData = {
    labels: ['전설 (60+)', '고수 (50+)', '단골 (42+)', '밥친구 (36.5+)', '새싹 (30+)', '주의 (<30)'],
    datasets: [
      {
        data: [5, 12, 25, 40, 15, 3],
        backgroundColor: ['#2E7D32', brand[400], brand[500], brand[600], brand[700], '#D32F2F'],
        borderColor: ['#2E7D32', brand[400], brand[500], brand[600], brand[700], '#D32F2F'],
        borderWidth: 1,
      },
    ],
  };

  if (loading && !stats) {
    return (
      <Box>
        <PageHeader title="관리자 대시보드" />
        <LoadingSkeleton variant="dashboard" />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box>
        <PageHeader title="관리자 대시보드" />
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const dateSelector = (
    <Box display="flex" alignItems="center" gap={2}>
      {realtimeData && (
        <Chip
          label={realtimeData.systemHealth === 'healthy' ? '시스템 정상' : '시스템 이상'}
          color={realtimeData.systemHealth === 'healthy' ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      )}
      {lastUpdated && (
        <Box display="flex" alignItems="center" gap={0.5}>
          <RefreshIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {format(lastUpdated, 'HH:mm:ss')} 갱신
          </Typography>
        </Box>
      )}
      <FormControl variant="outlined" size="small" sx={{ minWidth: 130 }}>
        <InputLabel>기간 선택</InputLabel>
        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} label="기간 선택">
          <MenuItem value="7">최근 7일</MenuItem>
          <MenuItem value="14">최근 14일</MenuItem>
          <MenuItem value="30">최근 30일</MenuItem>
          <MenuItem value="90">최근 90일</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="관리자 대시보드" subtitle="잇테이블 예약·매출 운영 현황" actions={dateSelector} />

      {/* ── 핵심 운영 KPI (v2) ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
        gap: 2,
        mb: 3,
      }}>
        <StatCard label="오늘 예약" value={num(stats?.today_reservations)} icon={<EventAvailableIcon />} color="primary" />
        <StatCard label="최근 7일 예약" value={num(stats?.week_reservations)} icon={<EventIcon />} color="primary" />
        <StatCard label="활성 매장" value={num(stats?.active_restaurants)} icon={<StorefrontIcon />} color="info" />
        <StatCard label="GMV 누적" value={won(stats?.gmv_total)} icon={<AttachMoneyIcon />} color="success" />
        <StatCard label="GMV (7일)" value={won(stats?.gmv_week)} icon={<PointOfSaleIcon />} color="success" />
        <StatCard label="노쇼율 (30일)" value={stats?.noshow_rate != null ? `${stats.noshow_rate}%` : '-'} icon={<TrendingDownIcon />} color="error" />
      </Box>

      {/* ── 처리 대기 (운영 액션 신호) ── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}>
        <StatCard label="승인 대기 신고" value={num(stats?.pending_reports ?? realtimeData?.pending_reports)} icon={<ReportProblemIcon />} color="warning" />
        <StatCard label="대기 문의" value={num(stats?.pending_support ?? realtimeData?.pending_support)} icon={<SupportAgentIcon />} color="info" />
        <StatCard label="총 수익(누적)" value={won(stats?.total_revenue)} icon={<AttachMoneyIcon />} color="success" />
      </Box>

      {/* ── 매장별 매출 TOP5 ── */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          매장별 매출 TOP5 (최근 30일)
        </Typography>
        {topRestaurants.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>순위</TableCell>
                <TableCell>매장명</TableCell>
                <TableCell align="right">매출</TableCell>
                <TableCell align="right">예약수</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topRestaurants.map((r, idx) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip label={idx + 1} size="small" color={idx === 0 ? 'primary' : 'default'} sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell align="right">{won(r.sales)}</TableCell>
                  <TableCell align="right">{num(r.reservation_count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={<StorefrontIcon />} title="매출 데이터가 없습니다" description="최근 30일간 결제 완료된 예약이 집계되면 표시됩니다." dense />
        )}
      </Paper>

      {/* ── 레거시(v1) 지표 — 접이식 ── */}
      <Paper sx={{ mb: 3 }}>
        <Button
          fullWidth
          onClick={() => setLegacyOpen((o) => !o)}
          startIcon={<HistoryIcon />}
          endIcon={legacyOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5, color: 'text.secondary', fontWeight: 600 }}
        >
          <Box component="span" sx={{ flexGrow: 1, textAlign: 'left' }}>레거시 (v1) 지표 — 회원 · 모임 · 밥알점수</Box>
        </Button>
        <Collapse in={legacyOpen} timeout="auto" unmountOnExit>
          <Box sx={{ p: 2.5, pt: 0 }}>

      {/* 회원/모임 KPI */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}>
        <StatCard label="총 회원" value={num(stats?.total_users)} subtitle={`이번 주 +${stats?.week_users ?? 0}`} icon={<PeopleIcon />} color="primary" />
        <StatCard label="오늘 가입" value={num(stats?.today_users)} subtitle={realtimeData ? `최근 1시간 +${realtimeData.new_users_hour}` : undefined} icon={<PersonAddIcon />} color="info" />
        <StatCard label="활성 모임" value={num(stats?.active_meetups)} subtitle={`오늘 신규 ${stats?.today_meetups ?? 0}개`} icon={<EventIcon />} color="secondary" />
        <StatCard label="완료 모임" value={num(stats?.completed_meetups)} subtitle={`전체 ${stats?.total_meetups ?? 0}개`} icon={<CheckCircleIcon />} color="success" />
        <StatCard label="노쇼 약속금" value={won(stats?.total_deposit_amount)} subtitle={`활성 ${stats?.active_deposits ?? 0}건`} icon={<AccountBalanceWalletIcon />} color="error" />
      </Box>

      {/* Charts */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        mb: 1,
      }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            사용자 증가 추이
          </Typography>
          {trends.length > 0 ? (
            <Line data={userGrowthData} options={chartOptions} />
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="text.secondary">데이터가 없습니다</Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            모임 활동
          </Typography>
          {trends.length > 0 ? (
            <Bar data={meetupActivityData} options={chartOptions} />
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="text.secondary">데이터가 없습니다</Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            밥알점수 분포
          </Typography>
          <Box display="flex" justifyContent="center" height={300}>
            <Doughnut
              data={babalScoreData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      font: { size: 11 },
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            실시간 현황
          </Typography>
          {realtimeData ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">활성 사용자 (24h)</Typography>
                <Typography variant="h6">{realtimeData.active_users_day?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">활성 채팅방</Typography>
                <Typography variant="h6">{realtimeData.active_chat_rooms?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">활성 광고</Typography>
                <Typography variant="h6">{realtimeData.active_ads?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">대기 예치금</Typography>
                <Typography variant="h6">{realtimeData.pending_deposits?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">총 포인트</Typography>
                <Typography variant="h6">{realtimeData.total_points?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">전체 채팅방</Typography>
                <Typography variant="h6">{realtimeData.total_chat_rooms?.toLocaleString() ?? 0}</Typography>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="text.secondary">실시간 데이터 로딩 중...</Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Recent Activity Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          일별 활동 추이
        </Typography>
        {trends.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>날짜</TableCell>
                <TableCell align="right">신규 사용자</TableCell>
                <TableCell align="right">신규 모임</TableCell>
                <TableCell align="right">완료 모임</TableCell>
                <TableCell align="right">신규 리뷰</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trends.slice().reverse().map((row) => (
                <TableRow key={row.date} hover>
                  <TableCell>{format(new Date(row.date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`+${row.new_users}`}
                      size="small"
                      color={row.new_users > 0 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">{num(row.new_meetups)}</TableCell>
                  <TableCell align="right">{num(row.completed_meetups)}</TableCell>
                  <TableCell align="right">{num(row.new_reviews)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={<HistoryIcon />} title="활동 데이터가 없습니다" description="선택한 기간에 집계된 활동이 없습니다." dense />
        )}
      </Paper>

          </Box>
        </Collapse>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
