import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import axios from 'axios';

interface ReportData {
  period: string;
  newUsers: number;
  newMeetups: number;
  completedMeetups: number;
  revenue: number;
  activeUsers: number;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [reportType, setReportType] = useState('weekly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ReportData[]>(`http://localhost:3001/api/admin/reports/${reportType}`);
      setReportData(response.data);
    } catch (error) {
      console.error('리포트 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await axios.get<Blob>(
        `http://localhost:3001/api/admin/reports/download/${reportType}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `혼밥시러_리포트_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('리포트 다운로드 실패:', error);
    }
  };

  const totalStats = reportData.reduce(
    (acc, curr) => ({
      newUsers: acc.newUsers + curr.newUsers,
      newMeetups: acc.newMeetups + curr.newMeetups,
      completedMeetups: acc.completedMeetups + curr.completedMeetups,
      revenue: acc.revenue + curr.revenue,
    }),
    { newUsers: 0, newMeetups: 0, completedMeetups: 0, revenue: 0 }
  );

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
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">
          리포트
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={downloadReport}
          sx={{ backgroundColor: '#C9B59C' }}
        >
          리포트 다운로드
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>리포트 기간</InputLabel>
          <Select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            label="리포트 기간"
          >
            <MenuItem value="daily">일별</MenuItem>
            <MenuItem value="weekly">주별</MenuItem>
            <MenuItem value="monthly">월별</MenuItem>
          </Select>
        </FormControl>
      </Box>

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
          title="총 신규 사용자"
          value={totalStats.newUsers}
          icon={<PeopleIcon fontSize="large" />}
          color="#C9B59C"
        />
        <StatCard
          title="총 신규 모임"
          value={totalStats.newMeetups}
          icon={<EventIcon fontSize="large" />}
          color="#D9CFC7"
        />
        <StatCard
          title="총 완료된 모임"
          value={totalStats.completedMeetups}
          icon={<TrendingUpIcon fontSize="large" />}
          color="#7A8A6E"
        />
        <StatCard
          title="총 수익"
          value={`₩${totalStats.revenue.toLocaleString()}`}
          icon={<TrendingUpIcon fontSize="large" />}
          color="#B5857A"
        />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            상세 통계 ({reportType === 'daily' ? '일별' : reportType === 'weekly' ? '주별' : '월별'})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>기간</TableCell>
                  <TableCell align="right">신규 사용자</TableCell>
                  <TableCell align="right">신규 모임</TableCell>
                  <TableCell align="right">완료된 모임</TableCell>
                  <TableCell align="right">활성 사용자</TableCell>
                  <TableCell align="right">수익</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.period}</TableCell>
                    <TableCell align="right">{row.newUsers}</TableCell>
                    <TableCell align="right">{row.newMeetups}</TableCell>
                    <TableCell align="right">{row.completedMeetups}</TableCell>
                    <TableCell align="right">{row.activeUsers}</TableCell>
                    <TableCell align="right">₩{row.revenue.toLocaleString()}</TableCell>
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

export default Reports;