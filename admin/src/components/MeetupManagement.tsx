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
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import PaymentIcon from '@mui/icons-material/Payment';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import apiClient from '../utils/api';

interface Meetup {
  id: string;
  title: string;
  hostName: string;
  location: string;
  date: string;
  time: string;
  currentParticipants: number;
  maxParticipants: number;
  category: string;
  status: '모집중' | '모집완료' | '진행중' | '종료' | '취소';
  createdAt: string;
}

interface MeetupDetails {
  meetup: {
    id: string;
    title: string;
    description: string;
    location: string;
    date: string;
    time: string;
    max_participants: number;
    category: string;
    status: string;
    created_at: string;
    host_name: string;
    host_email: string;
    participant_count: string;
  };
  participants: Array<{
    id: string;
    name: string;
    email: string;
    profile_image?: string;
    joined_at: string;
    participation_status: string;
    user_points: number;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    reviewer_name: string;
    reviewer_image?: string;
  }>;
  stats: {
    avgRating: number;
    reviewCount: number;
    participantCount: number;
  };
  payments: Array<{
    user_id: string;
    amount: number;
    status: string;
    created_at: string;
    user_name: string;
  }>;
}

const MeetupManagement: React.FC = () => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [selectedMeetupDetails, setSelectedMeetupDetails] = useState<MeetupDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  useEffect(() => {
    fetchMeetups();
  }, []);


  const fetchMeetups = async () => {
    try {
      const response = await apiClient.get<Meetup[]>(`/api/admin/meetups`);
      setMeetups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('모임 목록 로드 실패:', error);
      setMeetups([]);
    }
  };

  const fetchMeetupDetails = async (meetupId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/admin/meetups/${meetupId}/details`);
      
      if ((response.data as any).success) {
        setSelectedMeetupDetails((response.data as any).data);
      }
    } catch (error) {
      console.error('모임 상세 정보 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '모임 상세 정보를 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMeetupAction = async (meetupId: string, action: 'cancel' | 'approve') => {
    try {
      await apiClient.post(`/api/admin/meetups/${meetupId}/${action}`, {});
      
      fetchMeetups();
      // setDialogOpen(false); // 제거된 dialogOpen state
      setSnackbar({
        open: true,
        message: `모임이 성공적으로 ${action === 'approve' ? '승인' : '취소'}되었습니다.`,
        severity: 'success'
      });
    } catch (error) {
      console.error(`모임 ${action} 실패:`, error);
      setSnackbar({
        open: true,
        message: `모임 ${action === 'approve' ? '승인' : '취소'} 중 오류가 발생했습니다.`,
        severity: 'error'
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const reason = prompt('리뷰 삭제 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await apiClient.patch(`/api/admin/reviews/${reviewId}/delete`, { reason });

      if (selectedMeetupDetails) {
        await fetchMeetupDetails(selectedMeetupDetails.meetup.id);
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

  const handleViewDetails = async (meetup: Meetup) => {
    setSelectedMeetup(meetup);
    setDetailDialogOpen(true);
    setTabValue(0);
    await fetchMeetupDetails(meetup.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '모집중': return 'success';
      case '모집완료': return 'info';
      case '진행중': return 'warning';
      case '종료': return 'default';
      case '취소': return 'error';
      default: return 'default';
    }
  };

  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'korean': '한식',
      'japanese': '일식',
      'chinese': '중식',
      'western': '양식',
      'fusion': '퓨전',
      'cafe': '카페',
      'pub': '술집',
      'other': '기타'
    };
    return categoryMap[category] || category;
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      case 'refunded': return '환불됨';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const filteredMeetups = meetups.filter(meetup =>
    meetup.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meetup.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meetup.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderMeetupStats = () => {
    if (!selectedMeetupDetails) return null;

    const { stats, meetup } = selectedMeetupDetails;

    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <GroupIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.participantCount}</Typography>
          <Typography variant="caption" color="text.secondary">
            참가자 / {meetup.max_participants}
          </Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <StarIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.avgRating.toFixed(1)}</Typography>
          <Typography variant="caption" color="text.secondary">평균 평점</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <StarIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{stats.reviewCount}</Typography>
          <Typography variant="caption" color="text.secondary">리뷰 수</Typography>
        </Card>
        <Card sx={{ textAlign: 'center', p: 1, minWidth: 120, flex: '1 1 auto' }}>
          <PaymentIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6">{selectedMeetupDetails.payments.length}</Typography>
          <Typography variant="caption" color="text.secondary">결제 건수</Typography>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        모임 관리
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="모임 검색..."
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
              <TableCell>모임명</TableCell>
              <TableCell>호스트</TableCell>
              <TableCell>장소</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>일시</TableCell>
              <TableCell>참가자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMeetups.map((meetup) => (
              <TableRow key={meetup.id}>
                <TableCell>{meetup.title}</TableCell>
                <TableCell>{meetup.hostName}</TableCell>
                <TableCell>{meetup.location}</TableCell>
                <TableCell>{getCategoryText(meetup.category)}</TableCell>
                <TableCell>
                  {new Date(meetup.date).toLocaleDateString()} {meetup.time}
                </TableCell>
                <TableCell>
                  {meetup.currentParticipants}/{meetup.maxParticipants}
                </TableCell>
                <TableCell>
                  <Chip
                    label={meetup.status}
                    color={getStatusColor(meetup.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(meetup.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetails(meetup)}
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

      {/* 모임 상세 정보 다이얼로그 */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">모임 상세 정보</Typography>
            {selectedMeetupDetails && selectedMeetupDetails.meetup.status === '모집중' && (
              <Box display="flex" gap={1}>
                <Button
                  startIcon={<CheckCircleIcon />}
                  onClick={() => selectedMeetup && handleMeetupAction(selectedMeetup.id, 'approve')}
                  color="success"
                  variant="outlined"
                  size="small"
                >
                  승인
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={() => selectedMeetup && handleMeetupAction(selectedMeetup.id, 'cancel')}
                  color="error"
                  variant="outlined"
                  size="small"
                >
                  취소
                </Button>
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedMeetupDetails ? (
            <>
              {/* 모임 기본 정보 */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {selectedMeetupDetails.meetup.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 250px' }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PersonIcon color="primary" />
                        <Typography>
                          호스트: {selectedMeetupDetails.meetup.host_name}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LocationOnIcon color="primary" />
                        <Typography>
                          장소: {selectedMeetupDetails.meetup.location}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 250px' }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <EventIcon color="primary" />
                        <Typography>
                          일시: {new Date(selectedMeetupDetails.meetup.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <AccessTimeIcon color="primary" />
                        <Typography>
                          시간: {selectedMeetupDetails.meetup.time}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {selectedMeetupDetails.meetup.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {selectedMeetupDetails.meetup.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* 통계 카드 */}
              {renderMeetupStats()}

              {/* 탭 컨텐츠 */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="참가자 목록" />
                  <Tab label="리뷰 관리" />
                  <Tab label="결제 정보" />
                </Tabs>
              </Box>

              {/* 참가자 목록 탭 */}
              {tabValue === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>참가자 목록</Typography>
                  {selectedMeetupDetails.participants.length > 0 ? (
                    <List>
                      {selectedMeetupDetails.participants.map((participant) => (
                        <ListItem key={participant.id} divider>
                          <ListItemAvatar>
                            <Avatar src={participant.profile_image}>
                              {participant.name.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="subtitle1">
                                  {participant.name}
                                </Typography>
                                <Chip 
                                  label={`${participant.user_points}P`}
                                  size="small"
                                  color="primary"
                                  icon={<AccountBalanceWalletIcon />}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {participant.email}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  참가일: {new Date(participant.joined_at).toLocaleString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">참가자가 없습니다.</Alert>
                  )}
                </Box>
              )}

              {/* 리뷰 관리 탭 */}
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>모임 리뷰</Typography>
                  {selectedMeetupDetails.reviews.length > 0 ? (
                    selectedMeetupDetails.reviews.map((review) => (
                      <Accordion key={review.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar src={review.reviewer_image}>
                                {review.reviewer_name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1">{review.reviewer_name}</Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Rating value={review.rating} readOnly size="small" />
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
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
                    <Alert severity="info">작성된 리뷰가 없습니다.</Alert>
                  )}
                </Box>
              )}

              {/* 결제 정보 탭 */}
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>예약금 결제 정보</Typography>
                  {selectedMeetupDetails.payments.length > 0 ? (
                    <List>
                      {selectedMeetupDetails.payments.map((payment, index) => (
                        <ListItem key={index} divider>
                          <ListItemAvatar>
                            <Avatar>
                              <PaymentIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="subtitle1">
                                  {payment.user_name}
                                </Typography>
                                <Typography variant="h6" color="primary">
                                  {payment.amount.toLocaleString()}원
                                </Typography>
                                <Chip
                                  label={getPaymentStatusText(payment.status)}
                                  size="small"
                                  color={getPaymentStatusColor(payment.status) as any}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                결제일: {new Date(payment.created_at).toLocaleString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">결제 정보가 없습니다.</Alert>
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

export default MeetupManagement;