import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import reviewApiService, { ReceivedReview } from '../../services/reviewApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface WrittenReview {
  id: string;
  meetup_title: string;
  meetup_location?: string;
  meetup_date?: string;
  rating: number;
  content: string;
  comment?: string;
  created_at: string;
  meetup_id?: string;
  host_name?: string;
  tags?: string[];
  images?: string[];
  is_anonymous?: boolean;
}

type TabType = 'written' | 'received';

interface EditModalState {
  visible: boolean;
  reviewId: string;
  rating: number;
  content: string;
}

interface ReplyModalState {
  visible: boolean;
  reviewId: string;
  reply: string;
}

const UniversalMyReviewsScreen: React.FC<{navigation: NavigationAdapter; user?: any; initialTab?: TabType}> = ({ navigation, initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'written');
  const [writtenReviews, setWrittenReviews] = useState<WrittenReview[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>({
    visible: false,
    reviewId: '',
    rating: 0,
    content: '',
  });
  const [replyModal, setReplyModal] = useState<ReplyModalState>({
    visible: false,
    reviewId: '',
    reply: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{ visible: boolean; uri: string }>({
    visible: false,
    uri: '',
  });

  const fetchWrittenReviews = useCallback(async () => {
    try {
      setError(null);
      const response = await reviewApiService.getWrittenReviews();
      setWrittenReviews(response.reviews || []);
    } catch (_error) {
      setError('작성한 리뷰를 불러오는데 실패했습니다');
    }
  }, []);

  const fetchReceivedReviews = useCallback(async () => {
    try {
      setError(null);
      const response = await reviewApiService.getReceivedReviews();
      setReceivedReviews(response.reviews || []);
    } catch (_error) {
      setError('받은 리뷰를 불러오는데 실패했습니다');
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchWrittenReviews(), fetchReceivedReviews()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWrittenReviews, fetchReceivedReviews]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleEditReview = (review: WrittenReview) => {
    setEditModal({
      visible: true,
      reviewId: review.id,
      rating: review.rating,
      content: review.content || review.comment || '',
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      '리뷰 삭제',
      '정말로 이 리뷰를 삭제하시겠습니까?\n삭제된 리뷰는 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewApiService.deleteReview(reviewId);
              setWrittenReviews(prev => prev.filter(r => r.id !== reviewId));
              Alert.alert('완료', '리뷰가 삭제되었습니다.');
            } catch (_error) {
              Alert.alert('오류', '리뷰 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleSubmitEdit = async () => {
    if (editModal.rating === 0) {
      Alert.alert('알림', '평점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await reviewApiService.updateReview(editModal.reviewId, {
        rating: editModal.rating,
        content: editModal.content.trim(),
      });

      setWrittenReviews(prev =>
        prev.map(r =>
          r.id === editModal.reviewId
            ? { ...r, rating: editModal.rating, content: editModal.content.trim() }
            : r
        )
      );

      setEditModal({ visible: false, reviewId: '', rating: 0, content: '' });
      Alert.alert('완료', '리뷰가 수정되었습니다.');
    } catch (_error) {
      Alert.alert('오류', '리뷰 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToReview = (review: ReceivedReview) => {
    setReplyModal({
      visible: true,
      reviewId: review.id,
      reply: '',
    });
  };

  const handleSubmitReply = async () => {
    if (!replyModal.reply.trim()) {
      Alert.alert('알림', '답변 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await reviewApiService.replyToReview(replyModal.reviewId, replyModal.reply.trim());

      setReceivedReviews(prev =>
        prev.map(r =>
          r.id === replyModal.reviewId
            ? { ...r, reply: replyModal.reply.trim(), can_reply: false }
            : r
        )
      );

      setReplyModal({ visible: false, reviewId: '', reply: '' });
      Alert.alert('완료', '답변이 등록되었습니다.');
    } catch (_error) {
      Alert.alert('오류', '답변 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive?: boolean, onSelect?: (star: number) => void) => {
    const numRating = Number(rating) || 0;
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity
            key={i}
            disabled={!interactive}
            onPress={() => onSelect?.(i)}
            style={interactive ? styles.starButton : undefined}
            activeOpacity={interactive ? 0.6 : 1}
          >
            <Icon
              name="star"
              size={size}
              color={i <= numRating ? COLORS.primary.accent : COLORS.neutral.grey200}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWrittenReviewItem = (review: WrittenReview) => (
    <View key={review.id} style={styles.reviewItem}>
      <TouchableOpacity
        style={styles.reviewContent}
        onPress={() => review.meetup_id && navigation.navigate('MeetupDetail', { meetupId: review.meetup_id })}
      >
        <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
        {review.host_name && (
          <Text style={styles.hostName}>호스트: {review.host_name}</Text>
        )}
        <View style={styles.ratingRow}>
          {renderStars(review.rating)}
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
        {(review.content || review.comment) && (
          <Text style={styles.comment}>{review.content || review.comment}</Text>
        )}
        {review.tags && review.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {review.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
              </View>
            ))}
          </View>
        )}
        {review.images && review.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
            <View style={styles.reviewImagesRow}>
              {review.images.map((img, idx) => (
                <TouchableOpacity key={idx} onPress={() => setImagePreviewModal({ visible: true, uri: img })}>
                  <Image source={{ uri: img }} style={styles.reviewImageThumb} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditReview(review)}
        >
          <Icon name="edit-2" size={16} color={COLORS.primary.accent} />
          <Text style={styles.actionButtonText}>수정</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteReview(review.id)}
        >
          <Icon name="trash-2" size={16} color={COLORS.functional.error} />
          <Text style={[styles.actionButtonText, styles.deleteText]}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReceivedReviewItem = (review: ReceivedReview) => (
    <View key={review.id} style={styles.reviewItem}>
      <View style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>

        <View style={styles.reviewerRow}>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          {renderStars(review.rating, 14)}
        </View>

        {review.comment && (
          <Text style={styles.comment}>{review.comment}</Text>
        )}

        {review.tags && review.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {review.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{String(tag).replace(/[\[\]"]/g, '').trim()}</Text>
              </View>
            ))}
          </View>
        )}

        {review.images && review.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
            <View style={styles.reviewImagesRow}>
              {review.images.map((img, idx) => (
                <TouchableOpacity key={idx} onPress={() => setImagePreviewModal({ visible: true, uri: img })}>
                  <Image source={{ uri: img }} style={styles.reviewImageThumb} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {review.reply ? (
          <View style={styles.replyContainer}>
            <Icon name="corner-down-right" size={14} color={COLORS.text.tertiary} />
            <View style={styles.replyBody}>
              <Text style={styles.replyLabel}>내 답변</Text>
              <Text style={styles.replyText}>{review.reply}</Text>
            </View>
          </View>
        ) : review.can_reply ? (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => handleReplyToReview(review)}
          >
            <Icon name="message-circle" size={16} color={COLORS.primary.accent} />
            <Text style={styles.replyButtonText}>답변하기</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModal.visible}
      transparent
      animationType="slide"
      onRequestClose={() => setEditModal({ visible: false, reviewId: '', rating: 0, content: '' })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>리뷰 수정</Text>
            <TouchableOpacity
              onPress={() => setEditModal({ visible: false, reviewId: '', rating: 0, content: '' })}
            >
              <Icon name="x" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>평점</Text>
            <View style={styles.editStarsRow}>
              {renderStars(editModal.rating, 32, true, (star) =>
                setEditModal(prev => ({ ...prev, rating: star }))
              )}
              <Text style={styles.editRatingText}>
                {editModal.rating === 0
                  ? '별점을 선택해주세요'
                  : editModal.rating <= 2
                  ? '아쉬웠어요'
                  : editModal.rating === 3
                  ? '보통이에요'
                  : editModal.rating === 4
                  ? '좋았어요'
                  : '최고예요!'}
              </Text>
            </View>

            <Text style={styles.modalLabel}>후기</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="후기를 수정해주세요"
              placeholderTextColor={COLORS.text.tertiary}
              value={editModal.content}
              onChangeText={(text) => setEditModal(prev => ({ ...prev, content: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCounter}>{editModal.content.length}/500</Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setEditModal({ visible: false, reviewId: '', rating: 0, content: '' })}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, (editModal.rating === 0 || submitting) && styles.modalSubmitDisabled]}
              onPress={handleSubmitEdit}
              disabled={editModal.rating === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.neutral.white} />
              ) : (
                <Text style={styles.modalSubmitText}>수정 완료</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderReplyModal = () => (
    <Modal
      visible={replyModal.visible}
      transparent
      animationType="slide"
      onRequestClose={() => setReplyModal({ visible: false, reviewId: '', reply: '' })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>리뷰 답변</Text>
            <TouchableOpacity
              onPress={() => setReplyModal({ visible: false, reviewId: '', reply: '' })}
            >
              <Icon name="x" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>답변 내용</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="리뷰에 대한 답변을 작성해주세요"
              placeholderTextColor={COLORS.text.tertiary}
              value={replyModal.reply}
              onChangeText={(text) => setReplyModal(prev => ({ ...prev, reply: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCounter}>{replyModal.reply.length}/300</Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setReplyModal({ visible: false, reviewId: '', reply: '' })}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, (!replyModal.reply.trim() || submitting) && styles.modalSubmitDisabled]}
              onPress={handleSubmitReply}
              disabled={!replyModal.reply.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.neutral.white} />
              ) : (
                <Text style={styles.modalSubmitText}>답변 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const currentReviews = activeTab === 'written' ? writtenReviews : receivedReviews;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 리뷰</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 리뷰</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'written' && styles.activeTab]}
          onPress={() => setActiveTab('written')}
        >
          <Text style={[styles.tabText, activeTab === 'written' && styles.activeTabText]}>
            작성한 리뷰 ({writtenReviews.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            받은 리뷰 ({receivedReviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary.accent}
            colors={[COLORS.primary.accent]}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchReviews}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : currentReviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="star" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>
              {activeTab === 'written' ? '작성한 리뷰가 없습니다' : '받은 리뷰가 없습니다'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'written'
                ? '약속에 참여 후 리뷰를 남겨보세요!'
                : '약속을 호스팅하면 리뷰를 받을 수 있어요'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeTab === 'written'
              ? writtenReviews.map(renderWrittenReviewItem)
              : receivedReviews.map(renderReceivedReviewItem)}
          </View>
        )}
      </ScrollView>

      {renderEditModal()}
      {renderReplyModal()}

      {/* Image preview modal */}
      <Modal
        visible={imagePreviewModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewModal({ visible: false, uri: '' })}
      >
        <TouchableOpacity
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setImagePreviewModal({ visible: false, uri: '' })}
        >
          <View style={styles.imageModalContent}>
            <Image
              source={{ uri: imagePreviewModal.uri }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setImagePreviewModal({ visible: false, uri: '' })}
            >
              <Icon name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary.accent,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  activeTabText: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  reviewItem: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  reviewContent: {
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
    letterSpacing: -0.2,
    flex: 1,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewDate: {
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
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
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary.accent,
  },
  deleteText: {
    color: COLORS.functional.error,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
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
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.accent,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary.accent,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // Review images
  reviewImagesScroll: {
    marginTop: 10,
    flexGrow: 0,
  },
  reviewImagesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewImageThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
  },
  // Image preview modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
  },
  imageModalClose: {
    position: 'absolute',
    top: -40,
    right: 0,
    padding: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  editStarsRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editRatingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    minHeight: 100,
    backgroundColor: COLORS.neutral.grey100,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});

export default UniversalMyReviewsScreen;
