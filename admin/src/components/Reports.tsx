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
  TableHead,
  TableRow,
  Button,
  Grid,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import apiClient from '../utils/api';
import { won } from '../utils/format';
import { PageHeader, EmptyState, StatCard, ResponsiveTableContainer } from './common';

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

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await apiClient.get<ReportData[]>(`/api/admin/reports/${reportType}`);
        setReportData(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('리포트 데이터 로드 실패:', error);
        setReportData([]);
      }
    };

    fetchReportData();
  }, [reportType]);

  const downloadReport = async () => {
    try {
      const response = await apiClient.get<Blob>(
        `/api/admin/reports/download/${reportType}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `잇테이블_리포트_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
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
      maxActiveUsers: Math.max(acc.maxActiveUsers, curr.activeUsers),
    }),
    { newUsers: 0, newMeetups: 0, completedMeetups: 0, revenue: 0, maxActiveUsers: 0 }
  );

  return (
    <Box>
      <PageHeader
        title="리포트"
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={downloadReport}
          >
            리포트 다운로드
          </Button>
        }
      />

      <Box sx={{ mb: 4 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
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

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard label="총 신규 사용자" value={totalStats.newUsers} icon={<PeopleIcon />} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard label="총 신규 약속" value={totalStats.newMeetups} icon={<EventIcon />} color="secondary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard label="총 완료된 약속" value={totalStats.completedMeetups} icon={<TrendingUpIcon />} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard label="최대 활성 사용자" value={totalStats.maxActiveUsers} icon={<PeopleIcon />} color="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard label="광고 수익" value={won(totalStats.revenue)} icon={<TrendingUpIcon />} color="warning" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            상세 통계 ({reportType === 'daily' ? '일별' : reportType === 'weekly' ? '주별' : '월별'})
          </Typography>
          {reportData.length === 0 ? (
            <EmptyState icon={<TrendingUpIcon />} title="리포트 데이터가 없습니다." dense />
          ) : (
            <ResponsiveTableContainer minWidth={720}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>기간</TableCell>
                    <TableCell align="right">신규 사용자</TableCell>
                    <TableCell align="right">신규 약속</TableCell>
                    <TableCell align="right">완료된 약속</TableCell>
                    <TableCell align="right">활성 사용자</TableCell>
                    <TableCell align="right">광고 수익</TableCell>
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
                      <TableCell align="right">{won(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;