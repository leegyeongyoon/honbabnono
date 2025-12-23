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
  Alert,
  Snackbar,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tab,
  Tabs,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StarIcon from '@mui/icons-material/Star';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineIcon from '@mui/icons-material/Timeline';
import apiClient from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'blocked' | 'pending';
}

interface UserDetails {
  user: {
    id: string;
    name: string;
    email: string;
    provider: string;
    provider_id?: string;
    is_verified: boolean;
    phone?: string;
    profile_image?: string;
    bio?: string;
    created_at: string;
    updated_at: string;
    last_login_at?: string;
    is_blocked: boolean;
    block_reason?: string;
    blocked_at?: string;
    blocked_by?: string;
  };
  stats: {
    totalPoints: number;
    hostedMeetups: number;
    joinedMeetups: number;
    reviewsWritten: number;
    avgRatingReceived: number;
    reviewsReceived: number;
  };
  pointHistory: Array<{
    amount: number;
    type: 'earned' | 'spent';
    description: string;
    created_at: string;
    related_meetup_id?: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    meetup_title: string;
    meetup_id: string;
  }>;
  recentActivity: Array<{
    type: 'meetup_created' | 'meetup_joined';
    description: string;
    timestamp: string;
  }>;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [pointAmount, setPointAmount] = useState('');
  const [pointDescription, setPointDescription] = useState('');
  const [pointType, setPointType] = useState<'earned' | 'spent'>('earned');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get<User[]>(`/api/admin/users`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setUsers([]);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/admin/users/${userId}/details`);
      
      if ((response.data as any).success) {
        setSelectedUserDetails((response.data as any).data);
      }
    } catch (error) {
      console.error('사용자 상세 정보 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 상세 정보를 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUserAction = async (userId: string, action: 'block' | 'unblock' | 'verify') => {
    try {
      if (action === 'block') {
        return;
      }
      
      await apiClient.post(`/api/admin/users/${userId}/${action}`, {});
      
      fetchUsers();
      // setDialogOpen(false); // 제거된 dialogOpen state
      setSnackbar({ 
        open: true, 
        message: `${action === 'verify' ? '인증' : '차단 해제'}가 완료되었습니다.`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error(`사용자 ${action} 실패:`, error);
      setSnackbar({ 
        open: true, 
        message: `${action === 'verify' ? '인증' : '차단 해제'} 중 오류가 발생했습니다.`, 
        severity: 'error' 
      });
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser || !blockReason) return;

    try {
      await apiClient.post(`/api/admin/users/${selectedUser.id}/block`, {
        reason: blockReason,
      });
      
      fetchUsers();
      setBlockDialogOpen(false);
      setBlockReason('');
      setSnackbar({ 
        open: true, 
        message: '사용자가 차단되었습니다.', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('사용자 차단 실패:', error);
      setSnackbar({ 
        open: true, 
        message: '사용자 차단 중 오류가 발생했습니다.', 
        severity: 'error' 
      });
    }
  };

  const handlePointAdjustment = async () => {
    if (!selectedUserDetails || !pointAmount || !pointDescription) return;

    try {
      await apiClient.post(`/api/admin/users/${selectedUserDetails.user.id}/points`, {
        amount: parseInt(pointAmount),
        description: pointDescription,
        type: pointType,
      });

      // 포인트 조정 후 상세 정보 다시 로드
      await fetchUserDetails(selectedUserDetails.user.id);
      
      setPointDialogOpen(false);
      setPointAmount('');
      setPointDescription('');
      setSnackbar({
        open: true,
        message: '포인트가 성공적으로 조정되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('포인트 조정 실패:', error);
      setSnackbar({
        open: true,
        message: '포인트 조정 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const reason = prompt('리뷰 삭제 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await axios.patch(`http://localhost:3001/api/admin/reviews/${reviewId}/delete`, 
        { reason },
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (selectedUserDetails) {
        await fetchUserDetails(selectedUserDetails.user.id);
      }

      setSnackbar({
        open: true,
        message: '리뷰가 성공적으로 삭제되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('리뷰 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '리뷰 삭제 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
    setTabValue(0);
    await fetchUserDetails(user.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'blocked': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'blocked': return '차단';
      case 'pending': return '대기';
      default: return status;
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

  const getActivityTypeText = (type: string) => {
    switch (type) {
      case 'meetup_created': return '모임 생성';
      case 'meetup_joined': return '모임 참가';
      default: return type;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUserStats = () => {
    if (!selectedUserDetails) return null;

    const { stats } = selectedUserDetails;

    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.totalPoints}</Typography>
          <Typography variant="caption" color="text.secondary">총 포인트</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <EventIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.hostedMeetups}</Typography>
          <Typography variant="caption" color="text.secondary">호스팅한 모임</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <GroupIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.joinedMeetups}</Typography>
          <Typography variant="caption" color="text.secondary">참가한 모임</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <StarIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.reviewsWritten}</Typography>
          <Typography variant="caption" color="text.secondary">작성한 리뷰</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <Rating value={stats.avgRatingReceived} readOnly precision={0.1} size="small" />
          <Typography variant="h6">{stats.avgRatingReceived.toFixed(1)}</Typography>
          <Typography variant="caption" color="text.secondary">받은 평점</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <StarIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.reviewsReceived}</Typography>
          <Typography variant="caption" color="text.secondary">받은 리뷰 수</Typography>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        사용자 관리
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="사용자 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>이름</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>로그인 방식</TableCell>
              <TableCell>인증 상태</TableCell>
              <TableCell>계정 상태</TableCell>
              <TableCell>가입일</TableCell>
              <TableCell>최근 로그인</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getProviderText(user.provider)}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isVerified ? '인증됨' : '미인증'}
                    color={user.isVerified ? 'success' : 'warning'}
                    size="small"
                    icon={user.isVerified ? <CheckCircleIcon /> : undefined}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(user.status)}
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(user)}
                    color="primary"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 사용자 상세 정보 다이얼로그 */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">사용자 상세 정보</Typography>
            {selectedUserDetails && (
              <Box display="flex" alignItems="center" gap={1}>
                <Button
                  startIcon={<AccountBalanceWalletIcon />}
                  onClick={() => setPointDialogOpen(true)}
                  variant="outlined"
                  size="small"
                >
                  포인트 관리
                </Button>
                {selectedUser && selectedUser.status === 'active' && (
                  <Button
                    startIcon={<BlockIcon />}
                    onClick={() => {
                      setBlockDialogOpen(true);
                      setDetailDialogOpen(false);
                    }}
                    color="error"
                    variant="outlined"
                    size="small"
                  >
                    사용자 차단
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedUserDetails ? (
            <>
              {/* 사용자 기본 정보 */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      src={selectedUserDetails.user.profile_image}
                      sx={{ width: 64, height: 64, mr: 2 }}
                    >
                      {selectedUserDetails.user.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedUserDetails.user.name}</Typography>
                      <Typography color="text.secondary">{selectedUserDetails.user.email}</Typography>
                      <Typography variant="body2">
                        가입일: {new Date(selectedUserDetails.user.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedUserDetails.user.bio && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {selectedUserDetails.user.bio}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* 통계 카드 */}
              {renderUserStats()}

              {/* 탭 컨텐츠 */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="포인트 내역" />
                  <Tab label="리뷰 관리" />
                  <Tab label="활동 이력" />
                </Tabs>
              </Box>

              {/* 포인트 내역 탭 */}
              {tabValue === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>포인트 사용 내역</Typography>
                  {selectedUserDetails.pointHistory.length > 0 ? (
                    <List>
                      {selectedUserDetails.pointHistory.map((point, index) => (
                        <ListItem key={index} divider>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              bgcolor: point.type === 'earned' ? 'success.main' : 'error.main' 
                            }}>
                              {point.type === 'earned' ? <AddIcon /> : <RemoveIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={point.description}
                            secondary={`${point.type === 'earned' ? '+' : '-'}${point.amount}P | ${new Date(point.created_at).toLocaleString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">포인트 사용 내역이 없습니다.</Alert>
                  )}
                </Box>
              )}

              {/* 리뷰 관리 탭 */}
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>작성한 리뷰</Typography>
                  {selectedUserDetails.recentReviews.length > 0 ? (
                    selectedUserDetails.recentReviews.map((review) => (
                      <Accordion key={review.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                            <Box>
                              <Typography variant="subtitle1">{review.meetup_title}</Typography>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Rating value={review.rating} readOnly size="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReview(review.id);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography>{review.comment}</Typography>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  ) : (
                    <Alert severity="info">작성한 리뷰가 없습니다.</Alert>
                  )}
                </Box>
              )}

              {/* 활동 이력 탭 */}
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>최근 활동</Typography>
                  {selectedUserDetails.recentActivity.length > 0 ? (
                    <List>
                      {selectedUserDetails.recentActivity.map((activity, index) => (
                        <ListItem key={index} divider>
                          <ListItemAvatar>
                            <Avatar>
                              <TimelineIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${getActivityTypeText(activity.type)}: ${activity.description}`}
                            secondary={new Date(activity.timestamp).toLocaleString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">최근 활동이 없습니다.</Alert>
                  )}
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 포인트 조정 다이얼로그 */}
      <Dialog open={pointDialogOpen} onClose={() => setPointDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>포인트 조정</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>포인트 타입</InputLabel>
              <Select
                value={pointType}
                onChange={(e) => setPointType(e.target.value as 'earned' | 'spent')}
                label="포인트 타입"
              >
                <MenuItem value="earned">적립</MenuItem>
                <MenuItem value="spent">차감</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="포인트 수량"
              type="number"
              value={pointAmount}
              onChange={(e) => setPointAmount(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="조정 사유"
              multiline
              rows={3}
              value={pointDescription}
              onChange={(e) => setPointDescription(e.target.value)}
              placeholder="포인트 조정 사유를 입력해주세요"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handlePointAdjustment}
            variant="contained"
            disabled={!pointAmount || !pointDescription}
          >
            조정
          </Button>
        </DialogActions>
      </Dialog>

      {/* 차단 다이얼로그 */}
      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsIcon sx={{ mr: 1, color: 'error.main' }} />
            관리자 회원 차단
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                관리자 권한으로 회원을 차단합니다. 이 작업은 신중하게 진행해주세요.
              </Alert>
              <Typography gutterBottom>
                <strong>{selectedUser.name}</strong>님 ({selectedUser.email})을 차단하시겠습니까?
              </Typography>
              <TextField
                fullWidth
                label="차단 사유"
                multiline
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="관리자 차단 사유를 입력해주세요 (5글자 이상)"
                sx={{ mt: 2 }}
                helperText={`${blockReason.length}/5 글자 이상 입력해주세요`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBlockDialogOpen(false);
            setBlockReason('');
          }}>
            취소
          </Button>
          <Button 
            onClick={handleBlockUser} 
            color="error" 
            variant="contained"
            disabled={blockReason.length < 5}
            startIcon={<BlockIcon />}
          >
            관리자 차단
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
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

export default UserManagement;