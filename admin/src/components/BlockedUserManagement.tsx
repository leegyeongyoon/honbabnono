import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import apiClient from '../utils/api';

interface BlockedUser {
  block_id: string;
  reason: string;
  blocked_at: string;
  blocked_by: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    provider: string;
    is_verified: boolean;
    created_at: string;
    last_login_at?: string;
    profile_image?: string;
  };
}

interface BlockingStats {
  period_days: number;
  general_stats: {
    total_blocks: number;
    admin_blocks: number;
    user_blocks: number;
    blocks_today: number;
    blocks_this_week: number;
    blocks_period: number;
  };
  daily_trend: Array<{
    date: string;
    total: number;
    admin: number;
    user: number;
  }>;
  top_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

interface BlockUserDialogData {
  userId: string;
  userName: string;
}

const BlockedUserManagement: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [stats, setStats] = useState<BlockingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('blocked_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Dialog states
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [blockUserData, setBlockUserData] = useState<BlockUserDialogData | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [bulkUnblockDialogOpen, setBulkUnblockDialogOpen] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
    fetchStats();
  }, [page, searchTerm, sortBy, sortOrder]);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{
        success: boolean;
        data: BlockedUser[];
        pagination: {
          page: number;
          limit: number;
          totalCount: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>('/api/admin/blocked-users', {
        params: {
          page,
          limit: 20,
          search: searchTerm,
          sortBy,
          sortOrder,
        },
      });

      if (response.data.success) {
        setBlockedUsers(Array.isArray(response.data.data) ? response.data.data : []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('차단 회원 목록 로드 실패:', error);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: BlockingStats;
      }>('/api/admin/blocking-stats', {
        params: { period: 30 },
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('차단 통계 로드 실패:', error);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.delete(`/api/admin/users/${selectedUser.user.id}/unblock`);
      setUnblockDialogOpen(false);
      setSelectedUser(null);
      fetchBlockedUsers();
      fetchStats();
    } catch (error) {
      console.error('차단 해제 실패:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!blockUserData || !blockReason) return;

    try {
      await apiClient.post(`/api/admin/users/${blockUserData.userId}/block`, {
        reason: blockReason,
      });
      setBlockDialogOpen(false);
      setBlockUserData(null);
      setBlockReason('');
      fetchBlockedUsers();
      fetchStats();
    } catch (error) {
      console.error('회원 차단 실패:', error);
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await apiClient.post('/api/admin/users/bulk-unblock', {
        userIds: selectedUsers,
      });
      setBulkUnblockDialogOpen(false);
      setSelectedUsers([]);
      fetchBlockedUsers();
      fetchStats();
    } catch (error) {
      console.error('일괄 차단 해제 실패:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === blockedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(blockedUsers.map(user => user.user.id));
    }
  };

  const getProviderText = (provider: string) => {
    switch (provider) {
      case 'kakao': return '카카오';
      case 'google': return '구글';
      case 'email': return '이메일';
      default: return provider;
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
        차단 회원 관리
      </Typography>

      {/* 통계 카드 */}
      {stats && (
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
            title="전체 차단"
            value={stats.general_stats.total_blocks}
            icon={<ShieldIcon fontSize="large" />}
            color="#f44336"
          />
          <StatCard
            title="관리자 차단"
            value={stats.general_stats.admin_blocks}
            icon={<PersonIcon fontSize="large" />}
            color="#ff9800"
          />
          <StatCard
            title="오늘 차단"
            value={stats.general_stats.blocks_today}
            icon={<TrendingUpIcon fontSize="large" />}
            color="#2196f3"
          />
          <StatCard
            title="이번 주 차단"
            value={stats.general_stats.blocks_this_week}
            icon={<BarChartIcon fontSize="large" />}
            color="#4caf50"
          />
        </Box>
      )}

      {/* 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="이름, 이메일, 차단 사유 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>정렬 기준</InputLabel>
          <Select
            value={sortBy}
            label="정렬 기준"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="blocked_at">차단일시</MenuItem>
            <MenuItem value="name">이름</MenuItem>
            <MenuItem value="email">이메일</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 100 }}>
          <InputLabel>순서</InputLabel>
          <Select
            value={sortOrder}
            label="순서"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="DESC">내림차순</MenuItem>
            <MenuItem value="ASC">오름차순</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 일괄 작업 버튼 */}
      {selectedUsers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {selectedUsers.length}명의 회원이 선택되었습니다.
          </Alert>
          <Button
            variant="contained"
            color="warning"
            onClick={() => setBulkUnblockDialogOpen(true)}
            startIcon={<CheckCircleIcon />}
          >
            선택한 회원 차단 해제 ({selectedUsers.length}명)
          </Button>
        </Box>
      )}

      {/* 차단 회원 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={blockedUsers.length > 0 && selectedUsers.length === blockedUsers.length}
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < blockedUsers.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>회원 정보</TableCell>
              <TableCell>차단 사유</TableCell>
              <TableCell>차단한 사람</TableCell>
              <TableCell>차단일시</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blockedUsers.map((blockedUser) => (
              <TableRow key={blockedUser.block_id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedUsers.includes(blockedUser.user.id)}
                    onChange={() => handleSelectUser(blockedUser.user.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {blockedUser.user.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {blockedUser.user.email}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={getProviderText(blockedUser.user.provider)}
                        size="small"
                        variant="outlined"
                      />
                      {blockedUser.user.is_verified && (
                        <Chip
                          label="인증됨"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon />}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 300 }}>
                    {blockedUser.reason}
                  </Typography>
                </TableCell>
                <TableCell>
                  {blockedUser.blocked_by.id ? (
                    <Box>
                      <Typography variant="body2">
                        {blockedUser.blocked_by.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ({blockedUser.blocked_by.email})
                      </Typography>
                    </Box>
                  ) : (
                    <Chip
                      label="관리자"
                      size="small"
                      color="warning"
                      icon={<ShieldIcon />}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {formatDate(blockedUser.blocked_at)}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="success"
                    onClick={() => {
                      setSelectedUser(blockedUser);
                      setUnblockDialogOpen(true);
                    }}
                    startIcon={<CheckCircleIcon />}
                  >
                    차단 해제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* 차단 해제 확인 다이얼로그 */}
      <Dialog open={unblockDialogOpen} onClose={() => setUnblockDialogOpen(false)}>
        <DialogTitle>차단 해제 확인</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Typography>
              <strong>{selectedUser.user.name}</strong>님의 차단을 해제하시겠습니까?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnblockDialogOpen(false)}>취소</Button>
          <Button onClick={handleUnblockUser} color="success" variant="contained">
            차단 해제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 일괄 차단 해제 확인 다이얼로그 */}
      <Dialog open={bulkUnblockDialogOpen} onClose={() => setBulkUnblockDialogOpen(false)}>
        <DialogTitle>일괄 차단 해제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            선택한 <strong>{selectedUsers.length}명</strong>의 차단을 모두 해제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkUnblockDialogOpen(false)}>취소</Button>
          <Button onClick={handleBulkUnblock} color="warning" variant="contained">
            일괄 차단 해제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 회원 차단 다이얼로그 */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>회원 차단</DialogTitle>
        <DialogContent>
          {blockUserData && (
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                <strong>{blockUserData.userName}</strong>님을 차단하시겠습니까?
              </Typography>
              <TextField
                fullWidth
                label="차단 사유"
                multiline
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="차단 사유를 입력해주세요 (5글자 이상)"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleBlockUser} 
            color="error" 
            variant="contained"
            disabled={blockReason.length < 5}
            startIcon={<BlockIcon />}
          >
            차단
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlockedUserManagement;