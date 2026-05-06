import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
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

  // More menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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

  // Close menu on outside click
  useEffect(() => {
    const handleClick = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [menuOpenId]);

  const handleStartEdit = (review: WrittenReview) => {
    setMenuOpenId(null);
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
    setMenuOpenId(null);
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  };

  const renderStars = (rating: number, size: number = 12, interactive?: boolean, onSelect?: (star: number) => void) => {
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
              color={i <= numRating ? '#FFA529' : '#E0E0E0'}
            />
          </div>
        ))}
      </View>
    );
  };

  const renderWrittenReviewItem = (review: WrittenReview, index: number) => {
    const isEditing = editingId === review.id;
    const isLast = index === writtenReviews.length - 1;

    return (
      <div key={review.id} style={{ position: 'relative' as const }}>
        <View style={[styles.reviewCard, isLast && { borderBottomWidth: 0 }]}>
          {/* Top row: avatar, name, stars, date, more */}
          <View style={styles.reviewHeader}>
            <View style={styles.avatarCircle}>
              <Icon name="user" size={18} color="#BDBDBD" />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameStarsRow}>
                <Text style={styles.reviewerName}>{review.meetup_title || '매장'}</Text>
                {!isEditing && renderStars(review.rating ?? 0, 12)}
              </View>
              {!isEditing && (
                <Text style={styles.dateText}>{formatDate(review.created_at)}</Text>
              )}
            </View>

            {!isEditing && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === review.id ? null : review.id);
                }}
                style={{
                  cursor: 'pointer',
                  padding: 4,
                  marginLeft: 'auto',
                  position: 'relative' as const,
                }}
              >
                <Icon name="more-vertical" size={18} color="#878B94" />
              </div>
            )}
          </View>

          {/* More menu dropdown */}
          {menuOpenId === review.id && (
            <div style={webStyles.menuDropdown}>
              <div
                onClick={() => handleStartEdit(review)}
                style={webStyles.menuItem}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F5F5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon name="edit" size={14} color="#121212" />
                <span style={{ fontSize: 14, color: '#121212' }}>수정</span>
              </div>
              <div
                onClick={() => handleDeleteReview(review.id)}
                style={webStyles.menuItem}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F5F5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon name="trash-2" size={14} color="#D32F2F" />
                <span style={{ fontSize: 14, color: '#D32F2F' }}>삭제</span>
              </div>
            </div>
          )}

          {/* Edit form (stars row) */}
          {isEditing && (
            <View style={styles.editStarsRow}>
              {renderStars(editRating, 20, true, setEditRating)}
            </View>
          )}

          {/* Review text */}
          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editTextInput}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="후기를 수정해주세요"
                placeholderTextColor="#878B94"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCounter}>{editContent.length}/500</Text>
              <View style={styles.editActions}>
                <div
                  onClick={handleCancelEdit}
                  style={webStyles.cancelBtn}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </div>
                <div
                  onClick={handleSubmitEdit}
                  style={{
                    ...webStyles.submitBtn,
                    backgroundColor: editRating === 0 ? '#E0E0E0' : '#FFA529',
                    cursor: submitting || editRating === 0 ? 'not-allowed' : 'pointer',
                    opacity: submitting || editRating === 0 ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>수정 완료</Text>
                  )}
                </div>
              </View>
            </View>
          ) : (
            <Text style={styles.reviewContent}>
              {review.content}
            </Text>
          )}

          {/* Tags */}
          {!isEditing && review.tags && review.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {review.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </div>
    );
  };

  const renderReceivedReviewItem = (review: ReceivedReview, index: number) => {
    const isReplying = replyingId === review.id;
    const isLast = index === receivedReviews.length - 1;

    return (
      <div key={review.id}>
        <View style={[styles.reviewCard, isLast && { borderBottomWidth: 0 }]}>
          {/* Top row: avatar, name, stars, date */}
          <View style={styles.reviewHeader}>
            <View style={styles.avatarCircle}>
              <Icon name="user" size={18} color="#BDBDBD" />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameStarsRow}>
                <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                {renderStars(review.rating ?? 0, 12)}
              </View>
              <Text style={styles.dateText}>{formatDate(review.created_at)}</Text>
            </View>
          </View>

          {/* Review text */}
          <Text style={styles.reviewContent}>
            {review.comment}
          </Text>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {review.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reply */}
          {review.reply ? (
            <View style={styles.replyContainer}>
              <Icon name="arrow-right" size={14} color="#878B94" />
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
                placeholderTextColor="#878B94"
                multiline
                numberOfLines={3}
                maxLength={300}
              />
              <Text style={styles.charCounter}>{replyContent.length}/300</Text>
              <View style={styles.editActions}>
                <div
                  onClick={handleCancelReply}
                  style={webStyles.cancelBtn}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </div>
                <div
                  onClick={handleSubmitReply}
                  style={{
                    ...webStyles.submitBtn,
                    backgroundColor: !replyContent.trim() ? '#E0E0E0' : '#FFA529',
                    cursor: submitting || !replyContent.trim() ? 'not-allowed' : 'pointer',
                    opacity: submitting || !replyContent.trim() ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>답변 등록</Text>
                  )}
                </div>
              </View>
            </View>
          ) : review.can_reply ? (
            <div
              onClick={() => handleStartReply(review.id)}
              style={webStyles.replyButton}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <Icon name="message-circle" size={16} color="#FFA529" />
              <Text style={styles.replyButtonText}>답변하기</Text>
            </div>
          ) : null}
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
            <Icon name="chevron-left" size={24} color="#121212" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>후기관리</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="chevron-left" size={24} color="#121212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>후기관리</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs - Figma underline style matching MyMeetupsScreen */}
      <div style={webStyles.tabBar}>
        <button
          onClick={() => setSelectedFilter('written')}
          style={{
            ...webStyles.tabButton,
            color: selectedFilter === 'written' ? '#121212' : '#666',
            borderBottom: selectedFilter === 'written' ? '2px solid #121212' : '2px solid transparent',
          }}
        >
          쓴 후기
        </button>
        <button
          onClick={() => setSelectedFilter('received')}
          style={{
            ...webStyles.tabButton,
            color: selectedFilter === 'received' ? '#121212' : '#666',
            borderBottom: selectedFilter === 'received' ? '2px solid #121212' : '2px solid transparent',
          }}
        >
          받은 후기
        </button>
      </div>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {error && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={16} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
            <div onClick={() => setError(null)} style={{ cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size={16} color="#5F5F5F" />
            </div>
          </View>
        )}

        {/* Section count */}
        {currentReviews.length > 0 && (
          <Text style={styles.sectionCount}>
            {selectedFilter === 'written'
              ? `내가 쓴 후기 ${writtenReviews.length}개`
              : `내가 받은 후기 ${receivedReviews.length}개`
            }
          </Text>
        )}

        {currentReviews.length === 0 ? (
          <EmptyState
            icon="star"
            title={selectedFilter === 'written' ? '작성한 리뷰가 없습니다' : '받은 리뷰가 없습니다'}
            description={
              selectedFilter === 'written'
                ? '이용한 매장에 대한 리뷰를 작성해보세요!'
                : '매장을 이용하면 리뷰를 받을 수 있어요'
            }
            actionLabel={selectedFilter === 'written' ? '내 예약 보기' : undefined}
            onAction={selectedFilter === 'written' ? () => navigate('/my-reservations') : undefined}
          />
        ) : (
          <View style={styles.reviewsList}>
            {selectedFilter === 'written'
              ? writtenReviews.map((r, i) => renderWrittenReviewItem(r, i))
              : receivedReviews.map((r, i) => renderReceivedReviewItem(r, i))}
          </View>
        )}
      </ScrollView>
    </FadeIn>
  );
};

// Web-only styles (CSS-in-JS)
const webStyles = {
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #f1f2f3',
    backgroundColor: '#FFFFFF',
  } as React.CSSProperties,
  tabButton: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 14,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: -0.3,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 150ms ease',
  } as React.CSSProperties,
  cancelBtn: {
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #E0E0E0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  submitBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  replyButton: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #FFA529',
    borderRadius: 8,
    padding: '10px 0',
    marginTop: 12,
    gap: 6,
    transition: 'background-color 150ms ease',
  } as React.CSSProperties,
  menuDropdown: {
    position: 'absolute' as const,
    top: 52,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    zIndex: 100,
    overflow: 'hidden',
    minWidth: 100,
  } as React.CSSProperties,
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
  } as React.CSSProperties,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.2,
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentInner: {
    paddingBottom: 32,
  },
  skeletonWrap: {
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  sectionCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121212',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.08)',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
  },
  reviewsList: {
    backgroundColor: '#FFFFFF',
  },
  reviewCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f3',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  dateText: {
    fontSize: 13,
    color: '#878B94',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewContent: {
    fontSize: 15,
    color: '#121212',
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tagChip: {
    backgroundColor: '#f1f2f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagChipText: {
    fontSize: 13,
    color: '#5F5F5F',
  },
  // Edit form
  editForm: {
    marginBottom: 4,
  },
  editStarsRow: {
    marginBottom: 12,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#121212',
    minHeight: 80,
    backgroundColor: '#FAFAFA',
  },
  charCounter: {
    fontSize: 12,
    color: '#878B94',
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
    color: '#5F5F5F',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Reply styles
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    gap: 8,
  },
  replyBody: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#878B94',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    color: '#5F5F5F',
    lineHeight: 20,
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFA529',
  },
  replyForm: {
    marginTop: 12,
  },
  replyTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#121212',
    minHeight: 60,
    backgroundColor: '#FAFAFA',
  },
});

export default ReviewManagementScreen;
