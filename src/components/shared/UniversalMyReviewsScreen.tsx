import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface Review {
  id: string;
  meetup_title: string;
  rating: number;
  comment: string;
  created_at: string;
  meetup_id: string;
  host_name: string;
}

const UniversalMyReviewsScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setError(null);
      const response = await userApiService.getMyReviews();
      setReviews(response.data || response.reviews || []);
    } catch (_error) {
      setError('리뷰를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const renderStars = (rating: number) => (
    <View style={styles.starsContainer}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={16} color={i <= rating ? COLORS.primary.accent : COLORS.neutral.grey200} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
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
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>내 리뷰</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReviews();}} tintColor={COLORS.primary.accent} colors={[COLORS.primary.accent]} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchReviews}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="star" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>작성한 리뷰가 없습니다</Text>
            <Text style={styles.emptySubtext}>약속에 참여 후 리뷰를 남겨보세요!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {reviews.map(review => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewItem}
                onPress={() => navigation.navigate('MeetupDetail', { meetupId: review.meetup_id })}
              >
                <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
                <Text style={styles.hostName}>호스트: {review.host_name}</Text>
                <View style={styles.ratingRow}>
                  {renderStars(review.rating)}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <Text style={styles.comment}>{review.comment}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
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
  placeholder: {
    width: 24,
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
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
});

export default UniversalMyReviewsScreen;
