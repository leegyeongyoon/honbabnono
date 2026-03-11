import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import { FadeIn } from '../components/animated';
import EmptyState from '../components/EmptyState';
import { ListItemSkeleton } from '../components/skeleton';
import reviewApiService, { ReceivedReview } from '../services/reviewApiService';

interface WrittenReview {
  id: string;
  rating: number;
  content: string;
  tags?: string[];
  is_anonymous?: boolean;
  created_at: string;
  updated_at?: string;
  meetup_title: string;
  meetup_date?: string;
  meetup_location?: string;
}

const ReviewManagementScreen: React.FC = () => {
  const navigate = useNavigate();
  const [writtenReviews, setWrittenReviews] = useState<WrittenReview[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'written' | 'received'>('written');
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [writtenRes, receivedRes] = await Promise.all([
        reviewApiService.getWrittenReviews(),
        reviewApiService.getReceivedReviews(),
      ]);
      setWrittenReviews(writtenRes.reviews || []);
      setReceivedReviews(receivedRes.reviews || []);
    } catch (_error) {
      setError('리뷰를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStartEdit = (review: WrittenReview) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditContent(review.content || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditRating(0);
    setEditContent('');
  };

  const handleSubmitEdit = async () => {
    if (!editingId || editRating === 0) {return;}

    setSubmitting(true);
    try {
      await reviewApiService.updateReview(editingId, {
        rating: editRating,
        content: editContent.trim(),
      });

      setWrittenReviews(prev =>
        prev.map(r =>
          r.id === editingId
            ? { ...r, rating: editRating, content: editContent.trim() }
            : r
        )
      );
      handleCancelEdit();
    } catch (_error) {
      setError('리뷰 수정에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('정말로 이 리뷰를 삭제하시겠습니까?\n삭제된 리뷰는 복구할 수 없습니다.')) {
      return;
    }

    try {
      await reviewApiService.deleteReview(reviewId);
      setWrittenReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (_error) {
      setError('리뷰 삭제에 실패했습니다');
    }
  };

  const handleStartReply = (reviewId: string) => {
    setReplyingId(reviewId);
    setReplyContent('');
  };

  const handleCancelReply = () => {
    setReplyingId(null);
    setReplyContent('');
  };

  const handleSubmitReply = async () => {
    if (!replyingId || !replyContent.trim()) {return;}

    setSubmitting(true);
    try {
      await reviewApiService.replyToReview(replyingId, replyContent.trim());

      setReceivedReviews(prev =>
        prev.map(r =>
          r.id === replyingId
            ? { ...r, reply: replyContent.trim(), can_reply: false }
            : r
        )
      );
      handleCancelReply();
    } catch (_error) {
      setError('답변 등록에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: number = 14, interactive?: boolean, onSelect?: (star: number) => void) => {
    const numRating = Number(rating) || 0;
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            onClick={() => interactive && onSelect?.(i)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              padding: interactive ? 2 : 0,
            }}
          >
            <Icon
              name="star"
              size={size}
              color={i <= numRating ? COLORS.primary.main : COLORS.neutral.grey200}
            />
          </div>
        ))}
      </View>
    );
  };

  const renderWrittenReviewItem = (review: WrittenReview) => {
    const isEditing = editingId === review.id;

    return (
      <div
        key={review.id}
        onMouseEnter={(e) => { if (!isEditing) {(e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAF8';} }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        style={{ transition: 'background-color 150ms ease' }}
      >
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewTitleRow}>
              <View style={styles.avatarCircle}>
                <Icon name="edit" size={16} color={COLORS.primary.main} />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.reviewTitle} numberOfLines={1}>{review.meetup_title || '약속'}</Text>
                {isEditing ? (
                  <View style={styles.editStarsRow}>
                    {renderStars(editRating, 20, true, setEditRating)}
                  </View>
                ) : (
                  <View style={styles.ratingContainer}>
                    {renderStars(review.rating ?? 0)}
                    <Text style={styles.ratingText}>{review.rating ?? 0}.0</Text>
                  </View>
                )}
              </View>
            </View>

            {!isEditing && (
              <View style={styles.actionContainer}>
                <div
                  onClick={() => handleStartEdit(review)}
                  style={{ cursor: 'pointer', padding: 8, borderRadius: 6, backgroundColor: COLORS.neutral.light }}
                >
                  <Icon name="edit" size={14} color={COLORS.text.accent} />
                </div>
                <div
                  onClick={() => handleDeleteReview(review.id)}
                  style={{ cursor: 'pointer', padding: 8, borderRadius: 6, backgroundColor: COLORS.neutral.light }}
                >
                  <Icon name="trash-2" size={14} color={COLORS.functional.error} />
                </div>
              </View>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editTextInput}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="후기를 수정해주세요"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCounter}>{editContent.length}/500</Text>
              <View style={styles.editActions}>
                <div
                  onClick={handleCancelEdit}
                  style={{
                    cursor: 'pointer', padding: '8px 16px', borderRadius: 8,
                    border: `1px solid ${COLORS.neutral.grey200}`, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </div>
                <div
                  onClick={handleSubmitEdit}
                  style={{
                    cursor: submitting || editRating === 0 ? 'not-allowed' : 'pointer',
                    padding: '8px 16px', borderRadius: 8,
                    backgroundColor: editRating === 0 ? COLORS.neutral.grey200 : COLORS.primary.main,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    opacity: submitting || editRating === 0 ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.neutral.white} />
                  ) : (
                    <Text style={styles.submitText}>수정 완료</Text>
                  )}
                </div>
              </View>
            </View>
          ) : (
            <Text style={styles.reviewContent} numberOfLines={2}>
              {review.content}
            </Text>
          )}

          {!isEditing && review.tags && review.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {review.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {!isEditing && (
            <View style={styles.reviewFooter}>
              <Text style={styles.metaText}>
                {new Date(review.created_at).toLocaleDateString('ko-KR')}
              </Text>
              {review.meetup_location && (
                <>
                  <View style={styles.metaDivider} />
                  <Text style={styles.metaText}>{review.meetup_location}</Text>
                </>
              )}
            </View>
          )}
        </View>
      </div>
    );
  };

  const renderReceivedReviewItem = (review: ReceivedReview) => {
    const isReplying = replyingId === review.id;

    return (
      <div
        key={review.id}
        onMouseEnter={(e) => { if (!isReplying) {(e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAF8';} }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        style={{ transition: 'background-color 150ms ease' }}
      >
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewTitleRow}>
              <View style={styles.avatarCircle}>
                <Icon name="star" size={16} color={COLORS.primary.main} />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.reviewTitle} numberOfLines={1}>{review.meetup_title || '약속'}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.reviewerLabel}>{review.reviewer_name}</Text>
                  <View style={styles.ratingDot} />
                  {renderStars(review.rating ?? 0)}
                  <Text style={styles.ratingText}>{review.rating ?? 0}.0</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.reviewContent} numberOfLines={3}>
            {review.comment}
          </Text>

          {review.tags && review.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {review.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {review.reply ? (
            <View style={styles.replyContainer}>
              <Icon name="corner-down-right" size={14} color={COLORS.text.tertiary} />
              <View style={styles.replyBody}>
                <Text style={styles.replyLabel}>내 답변</Text>
                <Text style={styles.replyText}>{review.reply}</Text>
              </View>
            </View>
          ) : isReplying ? (
            <View style={styles.replyForm}>
              <TextInput
                style={styles.replyTextInput}
                value={replyContent}
                onChangeText={setReplyContent}
                placeholder="리뷰에 대한 답변을 작성해주세요"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
              <Text style={styles.charCounter}>{replyContent.length}/300</Text>
              <View style={styles.editActions}>
                <div
                  onClick={handleCancelReply}
                  style={{
                    cursor: 'pointer', padding: '8px 16px', borderRadius: 8,
                    border: `1px solid ${COLORS.neutral.grey200}`, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </div>
                <div
                  onClick={handleSubmitReply}
                  style={{
                    cursor: submitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                    padding: '8px 16px', borderRadius: 8,
                    backgroundColor: !replyContent.trim() ? COLORS.neutral.grey200 : COLORS.primary.main,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    opacity: submitting || !replyContent.trim() ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.neutral.white} />
                  ) : (
                    <Text style={styles.submitText}>답변 등록</Text>
                  )}
                </div>
              </View>
            </View>
          ) : review.can_reply ? (
            <div
              onClick={() => handleStartReply(review.id)}
              style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${COLORS.primary.accent}`,
                borderRadius: 8, padding: '10px 0', marginTop: 12, gap: 6,
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212,136,44,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <Icon name="message-circle" size={16} color={COLORS.primary.accent} />
              <Text style={styles.replyButtonText}>답변하기</Text>
            </div>
          ) : null}

          <View style={styles.reviewFooter}>
            <Text style={styles.metaText}>
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
      </div>
    );
  };

  const currentReviews = selectedFilter === 'written' ? writtenReviews : receivedReviews;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/mypage')}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>리뷰 관리</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <ListItemSkeleton key={i} size={48} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FadeIn style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰 관리</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <div
          onClick={() => setSelectedFilter('written')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 24px', cursor: 'pointer', minHeight: 48,
            borderBottom: selectedFilter === 'written' ? `3px solid ${COLORS.primary.main}` : '3px solid transparent',
            transition: 'border-color 200ms ease',
          }}
        >
          <Text style={[styles.filterText, selectedFilter === 'written' && styles.activeFilterText]}>
            작성한 리뷰 ({writtenReviews.length})
          </Text>
        </div>

        <div
          onClick={() => setSelectedFilter('received')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 24px', cursor: 'pointer', minHeight: 48,
            borderBottom: selectedFilter === 'received' ? `3px solid ${COLORS.primary.main}` : '3px solid transparent',
            transition: 'border-color 200ms ease',
          }}
        >
          <Text style={[styles.filterText, selectedFilter === 'received' && styles.activeFilterText]}>
            받은 리뷰 ({receivedReviews.length})
          </Text>
        </div>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {error && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={16} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <div onClick={() => setError(null)} style={{ cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size={16} color={COLORS.text.secondary} />
            </div>
          </View>
        )}

        {currentReviews.length === 0 ? (
          <EmptyState
            icon="star"
            title={selectedFilter === 'written' ? '작성한 리뷰가 없습니다' : '받은 리뷰가 없습니다'}
            description={
              selectedFilter === 'written'
                ? '참여한 약속에 대한 리뷰를 작성해보세요!'
                : '약속을 호스팅하면 리뷰를 받을 수 있어요'
            }
            actionLabel={selectedFilter === 'written' ? '내 약속 보기' : undefined}
            onAction={selectedFilter === 'written' ? () => navigate('/my-meetups') : undefined}
          />
        ) : (
          <View style={styles.reviewsList}>
            {selectedFilter === 'written'
              ? writtenReviews.map(renderWrittenReviewItem)
              : receivedReviews.map(renderReceivedReviewItem)}
          </View>
        )}
      </ScrollView>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...HEADER_STYLE.sub,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...HEADER_STYLE.subTitle,
  },
  headerRight: {
    width: 44,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,136,44,0.08)',
    paddingHorizontal: 4,
  },
  filterText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  skeletonWrap: {
    paddingTop: 8,
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.functional.error,
  },
  reviewsList: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reviewCard: {
    backgroundColor: 'transparent',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,136,44,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleWrap: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.accent,
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewerLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginRight: 6,
  },
  ratingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.neutral.grey300,
    marginRight: 6,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewContent: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: COLORS.neutral.grey100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.04)',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.neutral.grey200,
    marginHorizontal: 10,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.accent,
  },
  // Edit form
  editForm: {
    marginBottom: 12,
  },
  editStarsRow: {
    marginBottom: 8,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 80,
    backgroundColor: COLORS.neutral.grey100,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // Reply styles
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  replyBody: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary.accent,
  },
  replyForm: {
    marginTop: 12,
    marginBottom: 12,
  },
  replyTextInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 60,
    backgroundColor: COLORS.neutral.grey100,
  },
});

export default ReviewManagementScreen;
