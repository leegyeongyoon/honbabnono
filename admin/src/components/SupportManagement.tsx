import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import apiClient from '../utils/api';

interface SupportTicket {
  id: number;
  user_id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

interface TicketStats {
  total: number;
  open_count: number;
  in_progress: number;
  resolved: number;
  closed: number;
  today_count: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'warning',
  normal: 'info',
  low: 'default',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

const STATUS_LABELS: Record<string, string> = {
  open: '접수',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
};

const SupportManagement: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 20,
        status: statusFilter,
      };
      if (priorityFilter) {
        params.priority = priorityFilter;
      }
      const response = await apiClient.get('/api/admin/support-tickets', { params });
      const data = response.data as any;
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('티켓 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '지원 티켓을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/support-tickets/stats');
      const data = response.data as any;
      if (data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRowClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.admin_response || '');
    setTicketStatus(ticket.status);
    setDetailOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedTicket) return;

    try {
      setSaving(true);
      await apiClient.put(`/api/admin/support-tickets/${selectedTicket.id}`, {
        status: ticketStatus,
        admin_response: adminResponse,
        priority: selectedTicket.priority,
      });
      setSnackbar({
        open: true,
        message: '티켓이 성공적으로 업데이트되었습니다.',
        severity: 'success',
      });
      setDetailOpen(false);
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('티켓 업데이트 실패:', error);
      setSnackbar({
        open: true,
        message: '티켓 업데이트에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
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
          <Box sx={{ color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && tickets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        지원 티켓 관리
      </Typography>

      {/* 통계 카드 */}
      {stats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr 1fr',
          },
          gap: 3,
          mb: 4,
        }}>
          <StatCard
            title="접수 대기"
            value={stats.open_count}
            icon={<SupportAgentIcon fontSize="large" />}
            color="#f44336"
          />
          <StatCard
            title="처리중"
            value={stats.in_progress}
            icon={<HourglassEmptyIcon fontSize="large" />}
            color="#ff9800"
          />
          <StatCard
            title="해결 완료"
            value={stats.resolved}
            icon={<CheckCircleIcon fontSize="large" />}
            color="#4caf50"
          />
          <StatCard
            title="종료"
            value={stats.closed}
            icon={<ArchiveIcon fontSize="large" />}
            color="#9e9e9e"
          />
        </Box>
      )}

      {/* 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="open">접수</MenuItem>
            <MenuItem value="in_progress">처리중</MenuItem>
            <MenuItem value="resolved">해결</MenuItem>
            <MenuItem value="closed">종료</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>우선순위</InputLabel>
          <Select
            value={priorityFilter}
            label="우선순위"
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">전체</MenuItem>
            <MenuItem value="urgent">긴급</MenuItem>
            <MenuItem value="high">높음</MenuItem>
            <MenuItem value="normal">보통</MenuItem>
            <MenuItem value="low">낮음</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 티켓 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>제목</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>우선순위</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>접수일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(ticket)}
              >
                <TableCell>{ticket.id}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{ticket.user_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {ticket.user_email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 250,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ticket.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={ticket.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    size="small"
                    color={PRIORITY_COLORS[ticket.priority] || 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={STATUS_LABELS[ticket.status] || ticket.status}
                    size="small"
                    variant="outlined"
                    color={
                      ticket.status === 'open'
                        ? 'error'
                        : ticket.status === 'in_progress'
                        ? 'warning'
                        : ticket.status === 'resolved'
                        ? 'success'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{formatDate(ticket.created_at)}</TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary" sx={{ py: 4 }}>
                    티켓이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* 티켓 상세 다이얼로그 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          티켓 상세 #{selectedTicket?.id}
        </DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  사용자
                </Typography>
                <Typography variant="body1">
                  {selectedTicket.user_name} ({selectedTicket.user_email})
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  제목
                </Typography>
                <Typography variant="body1">{selectedTicket.title}</Typography>
              </Box>

              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Chip
                  label={selectedTicket.type}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                  size="small"
                  color={PRIORITY_COLORS[selectedTicket.priority] || 'default'}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  내용
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#F9F8F6' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.content}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  접수일시
                </Typography>
                <Typography variant="body2">
                  {formatDate(selectedTicket.created_at)}
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>상태 변경</InputLabel>
                <Select
                  value={ticketStatus}
                  label="상태 변경"
                  onChange={(e) => setTicketStatus(e.target.value)}
                >
                  <MenuItem value="open">접수</MenuItem>
                  <MenuItem value="in_progress">처리중</MenuItem>
                  <MenuItem value="resolved">해결</MenuItem>
                  <MenuItem value="closed">종료</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="관리자 응답"
                multiline
                rows={5}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="티켓에 대한 응답을 작성해주세요."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>취소</Button>
          <Button
            onClick={handleSaveResponse}
            variant="contained"
            disabled={saving}
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': {
                backgroundColor: '#A08B7A',
              },
            }}
          >
            {saving ? <CircularProgress size={24} /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupportManagement;
