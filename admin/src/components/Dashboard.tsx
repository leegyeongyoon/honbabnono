import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Snackbar,
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

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{
        width: 48,
        height: 48,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${color}20`,
        color,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
        borderColor: '#C9B59C',
        backgroundColor: 'rgba(201, 181, 156, 0.2)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '신규 리뷰',
        data: trends.map(item => item.new_reviews),
        borderColor: '#A08B7A',
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

  const babalScoreData = {
    labels: ['전설 (60+)', '고수 (50+)', '단골 (42+)', '밥친구 (36.5+)', '새싹 (30+)', '주의 (<30)'],
    datasets: [
      {
        data: [5, 12, 25, 40, 15, 3],
        backgroundColor: [
          '#FFD700',
          '#C9B59C',
          '#A08B7A',
          '#766653',
          '#90EE90',
          '#FF6B6B',
        ],
        borderColor: [
          '#FFD700',
          '#C9B59C',
          '#A08B7A',
          '#766653',
          '#90EE90',
          '#FF6B6B',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#C9B59C' }} />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          관리자 대시보드
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {lastUpdated && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <RefreshIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                마지막 갱신: {format(lastUpdated, 'HH:mm:ss')}
              </Typography>
            </Box>
          )}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
            <InputLabel>기간 선택</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              label="기간 선택"
            >
              <MenuItem value="7">최근 7일</MenuItem>
              <MenuItem value="14">최근 14일</MenuItem>
              <MenuItem value="30">최근 30일</MenuItem>
              <MenuItem value="90">최근 90일</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {realtimeData && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Chip
            label={realtimeData.systemHealth === 'healthy' ? '시스템 정상' : '시스템 이상'}
            color={realtimeData.systemHealth === 'healthy' ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            30초 자동 갱신
          </Typography>
        </Box>
      )}

      {/* KPI Cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}>
        <KpiCard
          title="총 회원"
          value={stats?.total_users ?? 0}
          subtitle={`이번 주 +${stats?.week_users ?? 0}`}
          icon={<PeopleIcon />}
          color="#4C422C"
        />
        <KpiCard
          title="오늘 가입"
          value={stats?.today_users ?? 0}
          subtitle={realtimeData ? `최근 1시간 +${realtimeData.new_users_hour}` : undefined}
          icon={<PersonAddIcon />}
          color="#C9B59C"
        />
        <KpiCard
          title="활성 모임"
          value={stats?.active_meetups ?? 0}
          subtitle={`오늘 신규 ${stats?.today_meetups ?? 0}개`}
          icon={<EventIcon />}
          color="#A08B7A"
        />
        <KpiCard
          title="완료 모임"
          value={stats?.completed_meetups ?? 0}
          subtitle={`전체 ${stats?.total_meetups ?? 0}개`}
          icon={<CheckCircleIcon />}
          color="#766653"
        />
        <KpiCard
          title="총 수익"
          value={`₩${(stats?.total_revenue ?? 0).toLocaleString()}`}
          icon={<AttachMoneyIcon />}
          color="#2E7D32"
        />
        <KpiCard
          title="대기 신고"
          value={stats?.pending_reports ?? realtimeData?.pending_reports ?? 0}
          icon={<ReportProblemIcon />}
          color="#ED6C02"
        />
        <KpiCard
          title="대기 문의"
          value={stats?.pending_support ?? realtimeData?.pending_support ?? 0}
          icon={<SupportAgentIcon />}
          color="#0288D1"
        />
        <KpiCard
          title="노쇼 약속금"
          value={`₩${(stats?.total_deposit_amount ?? 0).toLocaleString()}`}
          subtitle={`활성 ${stats?.active_deposits ?? 0}건`}
          icon={<AccountBalanceWalletIcon />}
          color="#D32F2F"
        />
      </Box>

      {/* Charts */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        mb: 3,
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
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
                <Typography variant="caption" color="text.secondary">활성 사용자 (24h)</Typography>
                <Typography variant="h6">{realtimeData.active_users_day?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
                <Typography variant="caption" color="text.secondary">활성 채팅방</Typography>
                <Typography variant="h6">{realtimeData.active_chat_rooms?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
                <Typography variant="caption" color="text.secondary">활성 광고</Typography>
                <Typography variant="h6">{realtimeData.active_ads?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
                <Typography variant="caption" color="text.secondary">대기 예치금</Typography>
                <Typography variant="h6">{realtimeData.pending_deposits?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
                <Typography variant="caption" color="text.secondary">총 포인트</Typography>
                <Typography variant="h6">{realtimeData.total_points?.toLocaleString() ?? 0}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#F9F8F6' }}>
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
          <TableContainer>
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
                        sx={{
                          backgroundColor: row.new_users > 0 ? '#C9B59C20' : undefined,
                          color: row.new_users > 0 ? '#4C422C' : undefined,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">{row.new_meetups.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.completed_meetups.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.new_reviews.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">선택한 기간에 데이터가 없습니다.</Alert>
        )}
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
