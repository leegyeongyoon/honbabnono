import React, { useState, useEffect } from 'react';
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
  Chip
} from '@mui/material';
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
  ArcElement
);

const API_BASE_URL = 'http://localhost:3001';

interface DailyStats {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalMeetups: number;
  activeMeetups: number;
  newMeetups: number;
  totalChatMessages: number;
  activeChatRooms: number;
  newChatRooms: number;
  totalRevenue: number;
  adImpressions: number;
  adClicks: number;
  pointsEarned: number;
  pointsUsed: number;
  systemErrors: number;
  apiCalls: number;
  responseTime: number;
}

interface RealtimeStats {
  totalUsers: number;
  activeUsers: number;
  totalMeetups: number;
  activeMeetups: number;
  totalChatRooms: number;
  activeChatRooms: number;
  totalRevenue: number;
  totalAds: number;
  activeAds: number;
  totalPoints: number;
  systemHealth: string;
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DailyStats[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');

  const fetchDashboardData = async (days: string) => {
    try {
      setLoading(true);
      
      const [dashboardRes, realtimeRes] = await Promise.all([
        apiClient.get(`/api/admin/dashboard-stats?days=${days}`),
        apiClient.get(`/api/admin/realtime-stats`)
      ]);
      
      setDashboardData((dashboardRes.data as any).stats || []);
      setRealtimeData((realtimeRes.data as any) || null);
      setError(null);
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.response?.data?.error || '대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(dateRange);
    const interval = setInterval(() => {
      fetchDashboardData(dateRange);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

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
    labels: dashboardData.map(item => format(new Date(item.date), 'MM/dd')),
    datasets: [
      {
        label: '총 사용자',
        data: dashboardData.map(item => item.totalUsers),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: '신규 사용자',
        data: dashboardData.map(item => item.newUsers),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
      {
        label: '활성 사용자',
        data: dashboardData.map(item => item.activeUsers),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const meetupActivityData = {
    labels: dashboardData.map(item => format(new Date(item.date), 'MM/dd')),
    datasets: [
      {
        label: '총 모임',
        data: dashboardData.map(item => item.totalMeetups),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: '활성 모임',
        data: dashboardData.map(item => item.activeMeetups),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
      {
        label: '신규 모임',
        data: dashboardData.map(item => item.newMeetups),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const revenueData = {
    labels: dashboardData.map(item => format(new Date(item.date), 'MM/dd')),
    datasets: [
      {
        label: '일일 수익 (원)',
        data: dashboardData.map(item => item.totalRevenue),
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const adPerformanceData = {
    labels: ['노출', '클릭', '미노출'],
    datasets: [
      {
        data: [
          dashboardData.reduce((sum, item) => sum + item.adImpressions, 0),
          dashboardData.reduce((sum, item) => sum + item.adClicks, 0),
          Math.max(0, (realtimeData?.totalAds || 0) - dashboardData.reduce((sum, item) => sum + item.adImpressions, 0))
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading && !realtimeData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        관리자 대시보드
      </Typography>

      <Box mb={3}>
        <FormControl variant="outlined" size="small">
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

      {realtimeData && (
        <Box sx={{ 
          mb: 3, 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: '1fr 1fr', 
            md: 'repeat(3, 1fr)',
            lg: 'repeat(6, 1fr)'
          }, 
          gap: 2 
        }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                총 사용자
              </Typography>
              <Typography variant="h5">
                {realtimeData.totalUsers?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="primary">
                활성: {realtimeData.activeUsers?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                총 모임
              </Typography>
              <Typography variant="h5">
                {realtimeData.totalMeetups?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="primary">
                활성: {realtimeData.activeMeetups?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                채팅방
              </Typography>
              <Typography variant="h5">
                {realtimeData.totalChatRooms?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="primary">
                활성: {realtimeData.activeChatRooms?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                총 수익
              </Typography>
              <Typography variant="h5">
                ₩{realtimeData.totalRevenue?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                광고
              </Typography>
              <Typography variant="h5">
                {realtimeData.totalAds?.toLocaleString() || '0'}
              </Typography>
              <Typography variant="body2" color="primary">
                활성: {realtimeData.activeAds?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                시스템 상태
              </Typography>
              <Chip 
                label={realtimeData.systemHealth}
                color={realtimeData.systemHealth === 'healthy' ? 'success' : 'error'}
                size="small"
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                포인트: {realtimeData.totalPoints?.toLocaleString() || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
        mb: 3
      }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            사용자 증가 추이
          </Typography>
          <Line data={userGrowthData} options={chartOptions} />
        </Paper>
        
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            모임 활동
          </Typography>
          <Bar data={meetupActivityData} options={chartOptions} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            수익 추이
          </Typography>
          <Line data={revenueData} options={chartOptions} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            광고 성과
          </Typography>
          <Box display="flex" justifyContent="center" height={300}>
            <Doughnut 
              data={adPerformanceData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          일별 상세 통계
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>날짜</TableCell>
                <TableCell align="right">신규 사용자</TableCell>
                <TableCell align="right">활성 사용자</TableCell>
                <TableCell align="right">신규 모임</TableCell>
                <TableCell align="right">채팅 메시지</TableCell>
                <TableCell align="right">일일 수익</TableCell>
                <TableCell align="right">광고 클릭률</TableCell>
                <TableCell align="right">응답시간 (ms)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.slice().reverse().map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{format(new Date(row.date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell align="right">{row.newUsers.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.activeUsers.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.newMeetups.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.totalChatMessages.toLocaleString()}</TableCell>
                  <TableCell align="right">₩{row.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    {row.adImpressions > 0 ? ((row.adClicks / row.adImpressions) * 100).toFixed(2) : '0.00'}%
                  </TableCell>
                  <TableCell align="right">{row.responseTime.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}