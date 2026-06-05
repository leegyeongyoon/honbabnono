import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TablePagination,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import CampaignIcon from '@mui/icons-material/Campaign';
import SendIcon from '@mui/icons-material/Send';
import apiClient from '../utils/api';
import { formatDateTime } from '../utils/format';
import { PageHeader, EmptyState, StatCard, LoadingSkeleton, ResponsiveTableContainer } from './common';

interface Notification {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationStats {
  notifications: {
    total: number;
    read_count: number;
    unread_count: number;
    today_count: number;
  };
  devices: {
    total_tokens: number;
    ios_tokens: number;
    android_tokens: number;
    web_tokens: number;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const NOTIFICATION_TYPES = [
  { value: '', label: '전체' },
  { value: 'meetup', label: '모임' },
  { value: 'chat', label: '채팅' },
  { value: 'review', label: '리뷰' },
  { value: 'point', label: '포인트' },
  { value: 'system', label: '시스템' },
  { value: 'badge', label: '뱃지' },
  { value: 'deposit', label: '예치금' },
];

const NotificationManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastType, setBroadcastType] = useState('system');
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        type: typeFilter,
      });
      const response = await apiClient.get(`/api/admin/notifications?${params}`);
      const data = response.data as any;
      setNotifications(data.notifications || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch {
      setSnackbar({
        open: true,
        message: '알림 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, typeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/notifications/stats');
      const data = response.data as any;
      setStats(data.data || null);
    } catch {
      // Stats failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastContent) return;

    try {
      setSending(true);
      await apiClient.post('/api/admin/notifications/broadcast', {
        title: broadcastTitle,
        content: broadcastContent,
        type: broadcastType,
      });
      setBroadcastDialogOpen(false);
      setBroadcastTitle('');
      setBroadcastContent('');
      setBroadcastType('system');
      setSnackbar({
        open: true,
        message: '전체 알림이 성공적으로 발송되었습니다.',
        severity: 'success',
      });
      fetchNotifications();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '알림 발송 중 오류가 발생했습니다.',
        severity: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const getTypeText = (type: string): string => {
    const found = NOTIFICATION_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const readRate = stats?.notifications
    ? stats.notifications.total > 0
      ? ((stats.notifications.read_count / stats.notifications.total) * 100).toFixed(1)
      : '0'
    : '0';

  return (
    <Box>
      <PageHeader
        title="알림 관리"
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<CampaignIcon />}
            onClick={() => setBroadcastDialogOpen(true)}
          >
            전체 알림 발송
          </Button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="전체 알림"
              value={stats.notifications.total.toLocaleString()}
              icon={<NotificationsIcon />}
              color="primary"
              subtitle={`오늘 +${stats.notifications.today_count}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="읽음률"
              value={`${readRate}%`}
              icon={<MarkEmailReadIcon />}
              color="success"
              subtitle={`${stats.notifications.read_count} / ${stats.notifications.total}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="디바이스 토큰"
              value={stats.devices.total_tokens.toLocaleString()}
              icon={<PhoneIphoneIcon />}
              color="info"
              subtitle={`iOS ${stats.devices.ios_tokens}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PhoneAndroidIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">
                      {stats.devices.android_tokens}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PhoneIphoneIcon sx={{ fontSize: 18, color: 'info.main' }} />
                    <Typography variant="body2">
                      {stats.devices.ios_tokens}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <DesktopWindowsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {stats.devices.web_tokens}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  플랫폼별 디바이스
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>알림 유형</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            label="알림 유형"
          >
            {NOTIFICATION_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Notification List */}
      {loading ? (
        <LoadingSkeleton variant="table" columns={5} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<NotificationsIcon />} title="알림 내역이 없습니다." />
      ) : (
        <ResponsiveTableContainer minWidth={780}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>사용자</TableCell>
                <TableCell>제목</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>유형</TableCell>
                <TableCell>읽음</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>일시</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {notification.user_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                      {notification.content}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Chip
                      label={getTypeText(notification.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={notification.is_read ? '읽음' : '안 읽음'}
                      size="small"
                      color={notification.is_read ? 'success' : 'default'}
                      variant={notification.is_read ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2">
                      {formatDateTime(notification.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            rowsPerPage={pagination.limit}
            onPageChange={(_, newPage) => setPagination(prev => ({ ...prev, page: newPage + 1 }))}
            onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="페이지당 행:"
          />
        </ResponsiveTableContainer>
      )}

      {/* Broadcast Dialog */}
      <Dialog open={broadcastDialogOpen} onClose={() => setBroadcastDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CampaignIcon sx={{ color: 'primary.main' }} />
            전체 알림 발송
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              모든 사용자에게 푸시 알림이 발송됩니다. 신중하게 작성해주세요.
            </Alert>
            <TextField
              fullWidth
              label="알림 제목"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="알림 제목을 입력하세요"
              required
            />
            <TextField
              fullWidth
              label="알림 내용"
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              multiline
              rows={4}
              placeholder="알림 내용을 입력하세요"
              required
            />
            <FormControl fullWidth>
              <InputLabel>알림 유형</InputLabel>
              <Select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value)}
                label="알림 유형"
              >
                <MenuItem value="system">시스템</MenuItem>
                <MenuItem value="meetup">모임</MenuItem>
                <MenuItem value="point">포인트</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleBroadcast}
            variant="contained"
            color="primary"
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={!broadcastTitle || !broadcastContent || sending}
          >
            {sending ? '발송 중...' : '발송'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
};

export default NotificationManagement;
