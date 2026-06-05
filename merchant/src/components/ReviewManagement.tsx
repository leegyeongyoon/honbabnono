import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Rating,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import { Reply as ReplyIcon, Edit as EditIcon } from '@mui/icons-material';
import apiClient from '../utils/api';
import getRestaurantId from '../utils/getRestaurantId';

// ── Types ──────────────────────────────────────────────────────
interface Review {
  id: string; // UUID
  reviewer_name: string;
  taste_rating: number;
  service_rating: number;
  ambiance_rating: number;
  overall_rating: number;
  content: string;
  images?: string[];
  reply?: string | null;
  replied_at?: string | null;
  created_at: string;
}

// ── Style constants ────────────────────────────────────────────
const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';
const BRAND_LIGHT = '#FAF6F3';
const PAGE_SIZE = 10;

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Component ──────────────────────────────────────────────────
const ReviewManagement: React.FC = () => {
  const restaurantId = getRestaurantId();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 답글 편집 상태: reviewId -> 입력값
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchReviews = useCallback(async (targetPage: number, append: boolean) => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/api/reviews/restaurant/${restaurantId}`, {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      const d = res.data.data || res.data;
      const list: Review[] = d.reviews ?? (Array.isArray(d) ? d : []);
      const totalCount = d.pagination?.total ?? list.length;
      setReviews((prev) => (append ? [...prev, ...list] : list));
      setTotal(totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || '리뷰를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    setPage(1);
    fetchReviews(1, false);
  }, [restaurantId, fetchReviews]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchReviews(next, true);
  };

  const handleReplyChange = (reviewId: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: value }));
  };

  const startEditReply = (review: Review) => {
    setEditingReplyId(review.id);
    setReplyDrafts((prev) => ({ ...prev, [review.id]: review.reply || '' }));
  };

  const submitReply = async (review: Review) => {
    const text = (replyDrafts[review.id] ?? '').trim();
    if (!text) {
      setSnackbar({ open: true, message: '답글 내용을 입력해주세요.', severity: 'error' });
      return;
    }
    setSubmittingId(review.id);
    try {
      await apiClient.put(`/api/reviews/restaurant/${review.id}/reply`, { reply: text });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, reply: text, replied_at: new Date().toISOString() } : r
        )
      );
      setEditingReplyId(null);
      setSnackbar({ open: true, message: '답글이 등록되었습니다.', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || '답글 등록에 실패했습니다.', severity: 'error' });
    } finally {
      setSubmittingId(null);
    }
  };

  if (!restaurantId) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>리뷰 관리</Typography>
        <Alert severity="info">
          매장 등록을 먼저 완료해주세요. (매장 정보 탭에서 등록 가능)
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>리뷰 관리</Typography>
        <Chip label={`총 ${total}건`} size="small" sx={{ bgcolor: BRAND_LIGHT, color: BRAND_DARK, fontWeight: 600 }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && reviews.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: BRAND }} />
        </Box>
      )}

      {!loading && reviews.length === 0 && !error && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          아직 등록된 리뷰가 없습니다.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {reviews.map((review) => {
          const isEditing = editingReplyId === review.id;
          const hasReply = !!review.reply;
          return (
            <Card
              key={review.id}
              variant="outlined"
              sx={{ borderRadius: 2.5, borderColor: 'rgba(17,17,17,0.06)' }}
            >
              <CardContent>
                {/* Header: reviewer + overall + date */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{review.reviewer_name || '익명'}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Rating value={Number(review.overall_rating) || 0} precision={0.5} size="small" readOnly />
                      <Typography variant="body2" color="text.secondary">
                        {(Number(review.overall_rating) || 0).toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(review.created_at)}
                  </Typography>
                </Box>

                {/* 3축 평가 */}
                <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
                  {[
                    { label: '맛', value: review.taste_rating },
                    { label: '서비스', value: review.service_rating },
                    { label: '분위기', value: review.ambiance_rating },
                  ].map((axis) => (
                    <Box key={axis.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>{axis.label}</Typography>
                      <Rating value={Number(axis.value) || 0} precision={0.5} size="small" readOnly />
                    </Box>
                  ))}
                </Box>

                {/* 내용 */}
                {review.content && (
                  <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                    {review.content}
                  </Typography>
                )}

                {/* 이미지 썸네일 */}
                {Array.isArray(review.images) && review.images.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {review.images.map((img, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={img}
                        alt={`리뷰 이미지 ${i + 1}`}
                        sx={{ width: 80, height: 80, borderRadius: 1.5, objectFit: 'cover' }}
                      />
                    ))}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* 답글 영역 */}
                {hasReply && !isEditing ? (
                  <Box sx={{ bgcolor: BRAND_LIGHT, borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: BRAND_DARK }}>
                        사장님 답글
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => startEditReply(review)}
                        sx={{ color: BRAND_DARK }}
                      >
                        수정
                      </Button>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {review.reply}
                    </Typography>
                    {review.replied_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {formatDate(review.replied_at)}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      placeholder="고객에게 답글을 남겨보세요."
                      value={replyDrafts[review.id] ?? ''}
                      onChange={(e) => handleReplyChange(review.id, e.target.value)}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                      {isEditing && (
                        <Button size="small" onClick={() => setEditingReplyId(null)} sx={{ color: '#666' }}>
                          취소
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={submittingId === review.id ? <CircularProgress size={16} color="inherit" /> : <ReplyIcon />}
                        disabled={submittingId === review.id || !(replyDrafts[review.id] ?? '').trim()}
                        onClick={() => submitReply(review)}
                        sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK } }}
                      >
                        {isEditing ? '답글 수정' : '답글 등록'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* 더보기 */}
      {reviews.length < total && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loading}
            sx={{ borderColor: BRAND, color: BRAND_DARK }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: BRAND }} /> : '더보기'}
          </Button>
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReviewManagement;
