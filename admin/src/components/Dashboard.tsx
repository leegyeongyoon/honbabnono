import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
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
  todayMeetups: number;
  activeMeetups: number;
}

interface RecentMeetup {
  id: string;
  title: string;
  hostName: string;
  currentParticipants: number;
  maxParticipants: number;
  status: '모집중' | '모집완료' | '진행중' | '종료' | '취소';
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMeetups: 0,
    todayMeetups: 0,
    activeMeetups: 0,
  });
  const [recentMeetups, setRecentMeetups] = useState<RecentMeetup[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, meetupsResponse] = await Promise.all([
        axios.get<DashboardStats>(`${process.env.REACT_APP_API_URL}/admin/stats`),
        axios.get<RecentMeetup[]>(`${process.env.REACT_APP_API_URL}/admin/meetups`),
      ]);

      setStats(statsResponse.data || {
        totalUsers: 0,
        totalMeetups: 0,
        todayMeetups: 0,
        activeMeetups: 0,
      });
      
      // 최근 5개 모임만 표시
      const meetupsData = Array.isArray(meetupsResponse.data) ? meetupsResponse.data : [];
      setRecentMeetups(meetupsData.slice(0, 5));
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      setRecentMeetups([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '모집중':
        return 'success';
      case '모집완료':
        return 'info';
      case '진행중':
        return 'warning';
      case '종료':
        return 'default';
      case '취소':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    return status;
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

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: '1fr 1fr', 
          md: '1fr 1fr 1fr 1fr' 
        }, 
        gap: 3, 
        mb: 4 
      }}>
        <StatCard
          title="총 사용자"
          value={stats.totalUsers}
          icon={<PeopleIcon fontSize="large" />}
          color="#C9B59C"
        />
        <StatCard
          title="총 모임"
          value={stats.totalMeetups}
          icon={<EventIcon fontSize="large" />}
          color="#D9CFC7"
        />
        <StatCard
          title="오늘 생성된 모임"
          value={stats.todayMeetups}
          icon={<TrendingUpIcon fontSize="large" />}
          color="#7A8A6E"
        />
        <StatCard
          title="활성 모임"
          value={stats.activeMeetups}
          icon={<AttachMoneyIcon fontSize="large" />}
          color="#B5857A"
        />
      </Box>

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