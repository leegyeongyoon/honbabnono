import React, { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Switch,
  IconButton,
  Rating,
  TablePagination,
  Tooltip,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import RateReviewIcon from '@mui/icons-material/RateReview';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import ReportIcon from '@mui/icons-material/Report';
import TodayIcon from '@mui/icons-material/Today';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import apiClient from '../utils/api';

interface Review {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  meetup_id: string;
  meetup_title: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  is_reported: boolean;
  hide_reason?: string;
  created_at: string;
}

interface ReviewStats {
  total: number;
  avg_rating: number;
  hidden_count: number;
  today_count: number;
  positive_count: number;
  negative_count: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ReviewManagement: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [showReported, setShowReported] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        reported: String(showReported),
        hidden: String(showHidden),
      });
      const response = await apiClient.get(`/api/admin/reviews?${params}`);
      const data = response.data as any;
      setReviews(data.reviews || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch {
      setSnackbar({
        open: true,
        message: '리뷰 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, showReported, showHidden]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/reviews/stats');
      const data = response.data as any;
      setStats(data.data || null);
    } catch {
      // Stats failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleHideReview = async () => {
    if (!selectedReview || !hideReason) return;

    try {
      await apiClient.patch(`/api/admin/reviews/${selectedReview.id}/hide`, {
        reason: hideReason,
      });
      setHideDialogOpen(false);
      setSelectedReview(null);
      setHideReason('');
      setSnackbar({ open: true, message: '리뷰가 숨김 처리되었습니다.', severity: 'success' });
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '리뷰 숨김 처리 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleRestoreReview = async (reviewId: string) => {
    try {
      await apiClient.patch(`/api/admin/reviews/${reviewId}/restore`);
      setSnackbar({ open: true, message: '리뷰가 복원되었습니다.', severity: 'success' });
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '리뷰 복원 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      await apiClient.delete(`/api/admin/reviews/${selectedReview.id}`);
      setDeleteDialogOpen(false);
      setSelectedReview(null);
      setSnackbar({ open: true, message: '리뷰가 삭제되었습니다.', severity: 'success' });
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '리뷰 삭제 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return '#4CAF50';
    if (rating >= 3) return '#FF9800';
    return '#D32F2F';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        리뷰 관리
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr', md: 'repeat(6, 1fr)' },
          gap: 2,
          mb: 3,
        }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <RateReviewIcon sx={{ fontSize: 32, color: '#C9B59C', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
              <Typography variant="caption" color="text.secondary">전체 리뷰</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StarIcon sx={{ fontSize: 32, color: '#FFD700', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{Number(stats.avg_rating || 0).toFixed(1)}</Typography>
              <Typography variant="caption" color="text.secondary">평균 평점</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VisibilityOffIcon sx={{ fontSize: 32, color: '#757575', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.hidden_count}</Typography>
              <Typography variant="caption" color="text.secondary">숨김 리뷰</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TodayIcon sx={{ fontSize: 32, color: '#2196F3', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.today_count}</Typography>
              <Typography variant="caption" color="text.secondary">오늘 리뷰</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ThumbUpIcon sx={{ fontSize: 32, color: '#4CAF50', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.positive_count}</Typography>
              <Typography variant="caption" color="text.secondary">긍정 리뷰</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ThumbDownIcon sx={{ fontSize: 32, color: '#D32F2F', mb: 0.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.negative_count}</Typography>
              <Typography variant="caption" color="text.secondary">부정 리뷰</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={showReported}
              onChange={(e) => {
                setShowReported(e.target.checked);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#C9B59C' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C9B59C' },
              }}
            />
          }
          label="신고된 리뷰만"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showHidden}
              onChange={(e) => {
                setShowHidden(e.target.checked);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#C9B59C' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C9B59C' },
              }}
            />
          }
          label="숨김 리뷰만"
        />
      </Box>

      {/* Review List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress sx={{ color: '#C9B59C' }} />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>작성자</TableCell>
                <TableCell>모임</TableCell>
                <TableCell>평점</TableCell>
                <TableCell>내용</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작성일</TableCell>
                <TableCell>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <TableRow
                    key={review.id}
                    hover
                    sx={{
                      opacity: review.is_hidden ? 0.6 : 1,
                      backgroundColor: review.is_reported ? '#FFF3E010' : undefined,
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {review.reviewer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                        {review.meetup_title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: getRatingColor(review.rating) }}
                        >
                          {Number(review.rating || 0).toFixed(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ maxWidth: 250 }}
                        title={review.comment}
                      >
                        {review.comment}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {review.is_reported && (
                          <Chip
                            icon={<ReportIcon />}
                            label="신고됨"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {review.is_hidden && (
                          <Chip
                            icon={<VisibilityOffIcon />}
                            label="숨김"
                            size="small"
                            color="default"
                          />
                        )}
                        {!review.is_reported && !review.is_hidden && (
                          <Chip
                            label="정상"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {review.is_hidden ? (
                          <Tooltip title="복원">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleRestoreReview(review.id)}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="숨기기">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedReview(review);
                                setHideDialogOpen(true);
                              }}
                            >
                              <VisibilityOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedReview(review);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">리뷰가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              )}
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
        </TableContainer>
      )}

      {/* Hide Review Dialog */}
      <Dialog open={hideDialogOpen} onClose={() => setHideDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <VisibilityOffIcon sx={{ color: '#757575' }} />
            리뷰 숨기기
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ pt: 1 }}>
              <Card sx={{ mb: 2, bgcolor: '#F9F8F6' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedReview.reviewer_name}
                    </Typography>
                    <Rating value={selectedReview.rating} readOnly size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReview.comment}
                  </Typography>
                </CardContent>
              </Card>
              <TextField
                fullWidth
                label="숨김 사유"
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                multiline
                rows={3}
                placeholder="리뷰를 숨기는 사유를 입력해주세요"
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setHideDialogOpen(false);
            setHideReason('');
          }}>
            취소
          </Button>
          <Button
            onClick={handleHideReview}
            variant="contained"
            disabled={!hideReason}
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': { backgroundColor: '#A08B7A' },
            }}
          >
            숨기기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningAmberIcon sx={{ color: '#D32F2F' }} />
            리뷰 삭제
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                삭제된 리뷰는 복구할 수 없습니다.
              </Alert>
              <Typography variant="body2">
                <strong>{selectedReview.reviewer_name}</strong>님이 작성한 리뷰를 삭제하시겠습니까?
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Rating value={selectedReview.rating} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {selectedReview.comment.length > 50
                    ? `${selectedReview.comment.substring(0, 50)}...`
                    : selectedReview.comment}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteReview} color="error" variant="contained">
            삭제
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

export default ReviewManagement;
