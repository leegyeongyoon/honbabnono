import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import { Review, ReviewStats } from '../services/reviewApiService';

interface ReviewListProps {
  reviews: Review[];
  stats: ReviewStats;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  stats,
  loading = false,
  onLoadMore,
  hasMore = false
}) => {

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            size={14}
            color={star <= rating ? COLORS.functional.warning : COLORS.neutral.grey300}
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item: review }: { item: Review }) => (
    <View style={styles.reviewItem}>
      {/* 리뷰어 정보 */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerInitial}>
              {review.reviewer_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
            <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          {renderStars(review.rating)}
          <Text style={styles.ratingText}>{review.rating}.0</Text>
        </View>
      </View>

      {/* 리뷰 내용 */}
      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}

      {/* 태그 */}
      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {review.tags.map((tag, index) => (
            <View key={index} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>리뷰</Text>
        {stats.totalReviews > 0 && (
          <View style={styles.overallRating}>
            <Icon name="star" size={16} color={COLORS.functional.warning} />
            <Text style={styles.averageRating}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({stats.totalReviews}개)</Text>
          </View>
        )}
      </View>
      
      {stats.totalReviews === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 리뷰가 없습니다</Text>
          <Text style={styles.emptySubtext}>첫 번째 리뷰를 작성해보세요!</Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) {return null;}
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={onLoadMore}
        disabled={loading}
      >
        <Text style={styles.loadMoreText}>
          {loading ? '불러오는 중...' : '더 보기'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReviewItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  statsContainer: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  averageRating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  reviewItem: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    ...SHADOWS.small,
  },
  separator: {
    height: 8,
    backgroundColor: COLORS.neutral.background,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  loadMoreButton: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  loadMoreText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
});

export default ReviewList;