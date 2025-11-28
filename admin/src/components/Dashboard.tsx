import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import axios from 'axios';

interface DashboardStats {
  totalUsers: number;
  totalMeetups: number;
  activeMeetups: number;
  totalRevenue: number;
}

interface RecentMeetup {
  id: string;
  title: string;
  hostName: string;
  currentParticipants: number;
  maxParticipants: number;
  status: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMeetups: 0,
    activeMeetups: 0,
    totalRevenue: 0,
  });
  const [recentMeetups, setRecentMeetups] = useState<RecentMeetup[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersResponse, meetupsResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/admin/users/count'),
        axios.get('http://localhost:3001/api/admin/meetups/stats'),
      ]);

      setStats({
        totalUsers: usersResponse.data.count || 0,
        totalMeetups: meetupsResponse.data.total || 0,
        activeMeetups: meetupsResponse.data.active || 0,
        totalRevenue: meetupsResponse.data.revenue || 0,
      });

      setRecentMeetups(meetupsResponse.data.recent || []);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'completed':
        return '완료';
      case 'cancelled':
        return '취소';
      default:
        return status;
    }
  };

  const StatCard = ({ title, value, icon, color }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string; 
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="총 사용자"
            value={stats.totalUsers}
            icon={<PeopleIcon fontSize="large" />}
            color="#C9B59C"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="총 모임"
            value={stats.totalMeetups}
            icon={<EventIcon fontSize="large" />}
            color="#D9CFC7"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="활성 모임"
            value={stats.activeMeetups}
            icon={<TrendingUpIcon fontSize="large" />}
            color="#7A8A6E"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="총 수익"
            value={`₩${stats.totalRevenue.toLocaleString()}`}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#B5857A"
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            최근 생성된 모임
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>모임명</TableCell>
                  <TableCell>호스트</TableCell>
                  <TableCell>참가자</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentMeetups.map((meetup) => (
                  <TableRow key={meetup.id}>
                    <TableCell>{meetup.title}</TableCell>
                    <TableCell>{meetup.hostName}</TableCell>
                    <TableCell>
                      {meetup.currentParticipants}/{meetup.maxParticipants}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(meetup.status)}
                        color={getStatusColor(meetup.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(meetup.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;