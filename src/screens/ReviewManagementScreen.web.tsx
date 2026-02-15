import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { FadeIn } from '../components/animated';
import EmptyState from '../components/EmptyState';
import { ListItemSkeleton } from '../components/skeleton';
import apiClient from '../services/apiClient';

interface ManageableReview {
  id: string;
  rating: number;
  content: string;
  images: string[];
  created_at: string;
  updated_at: string;
  meetup_title: string;
  meetup_date: string;
  meetup_location: string;
  is_featured: boolean;
  like_count: number;
  reply_count: number;
}

const ReviewManagementScreen: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ManageableReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'featured' | 'recent'>('all');

  useEffect(() => {
    const fetchManageableReviews = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/reviews/manage');
        setReviews(response.data.reviews || []);
      } catch (error) {
        // silently handle error
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchManageableReviews();
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    Alert.alert(
      '리뷰 삭제',
      '정말로 이 리뷰를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/reviews/${reviewId}`);
              setReviews(prev => prev.filter(review => review.id !== reviewId));
              Alert.alert('성공', '리뷰가 삭제되었습니다.');
            } catch (error) {
              // silently handle error
              Alert.alert('오류', '리뷰 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleToggleFeatured = async (reviewId: string) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      await apiClient.patch(`/reviews/${reviewId}/feature`, {
        featured: !review?.is_featured
      });

      setReviews(prev =>
        prev.map(review =>
          review.id === reviewId
            ? { ...review, is_featured: !review.is_featured }
            : review
        )
      );
    } catch (error) {
      // silently handle error
      Alert.alert('오류', '리뷰 추천 상태 변경에 실패했습니다.');
    }
  };

  const getFilteredReviews = () => {
    switch (selectedFilter) {
      case 'featured':
        return reviews.filter(review => review.is_featured);
      case 'recent':
        return [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
      default:
        return reviews;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name="star"
          size={14}
          color={i <= rating ? COLORS.functional.warning : COLORS.neutral.grey200}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewItem = (review: ManageableReview) => (
    <TouchableOpacity
      key={review.id}
      style={styles.reviewCard}
      onPress={() => navigate(`/review/${review.id}`)}
      activeOpacity={0.7}
    >
      {/* 상단: 모임 제목 + 별점 */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewTitleRow}>
          <View style={[styles.avatarCircle, review.is_featured && styles.featuredAvatar]}>
            <Icon
              name={review.is_featured ? 'star' : 'edit'}
              size={16}
              color={review.is_featured ? COLORS.functional.warning : COLORS.primary.main}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.reviewTitle} numberOfLines={1}>{review.meetup_title || '모임'}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(review.rating ?? 0)}
              <Text style={styles.ratingText}>{review.rating ?? 0}.0</Text>
            </View>
          </View>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, review.is_featured && styles.featuredButton]}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFeatured(review.id);
            }}
          >
            <Icon
              name="star"
              size={14}
              color={review.is_featured ? COLORS.functional.warning : COLORS.text.tertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              navigate(`/review/${review.id}/edit`);
            }}
          >
            <Icon name="edit" size={14} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteReview(review.id);
            }}
          >
            <Icon name="trash-2" size={14} color={COLORS.functional.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 리뷰 내용 */}
      <Text style={styles.reviewContent} numberOfLines={2}>
        {review.content}
      </Text>

      {/* 하단: 메타 정보 */}
      <View style={styles.reviewFooter}>
        <Text style={styles.metaText}>
          {new Date(review.created_at).toLocaleDateString('ko-KR')}
        </Text>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Icon name="heart" size={12} color={COLORS.text.tertiary} />
          <Text style={styles.metaText}>{review.like_count ?? 0}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Icon name="message-circle" size={12} color={COLORS.text.tertiary} />
          <Text style={styles.metaText}>{review.reply_count ?? 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredReviews = getFilteredReviews();

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
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰 관리</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigate('/write-review')}
        >
          <Icon name="plus" size={20} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>

      {/* 필터 탭 */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.activeFilterButton]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.activeFilterText]}>
            전체 ({reviews.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'featured' && styles.activeFilterButton]}
          onPress={() => setSelectedFilter('featured')}
        >
          <Text style={[styles.filterText, selectedFilter === 'featured' && styles.activeFilterText]}>
            추천 ({reviews.filter(r => r.is_featured).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'recent' && styles.activeFilterButton]}
          onPress={() => setSelectedFilter('recent')}
        >
          <Text style={[styles.filterText, selectedFilter === 'recent' && styles.activeFilterText]}>
            최근 작성
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {filteredReviews.length === 0 ? (
          <EmptyState
            icon="star"
            title={selectedFilter === 'featured' ? '추천 리뷰가 없습니다' : '작성한 리뷰가 없습니다'}
            description="참여한 모임에 대한 리뷰를 작성해보세요!"
            actionLabel="내 모임 보기"
            onAction={() => navigate('/my-meetups')}
          />
        ) : (
          <View style={styles.reviewsList}>
            {filteredReviews.map(renderReviewItem)}
          </View>
        )}
      </ScrollView>
    </FadeIn>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerRight: {
    width: 32,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey100,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary.main,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.text.white,
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
    borderRadius: 16,
    marginHorizontal: 16,
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 16,
    ...SHADOWS.small,
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
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featuredAvatar: {
    backgroundColor: 'rgba(229, 168, 75, 0.15)',
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
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  reviewContent: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.neutral.grey200,
    marginHorizontal: 10,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
  },
  featuredButton: {
    backgroundColor: 'rgba(229, 168, 75, 0.12)',
  },
});

export default ReviewManagementScreen;
