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
      console.log('⭐ 내 리뷰 조회 시작');
      const response = await userApiService.getMyReviews();
      console.log('⭐ 내 리뷰 응답:', response);
      setReviews(response.data || response.reviews || []);
    } catch (error) {
      console.error('리뷰 조회 실패:', error);
      setError('리뷰를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const renderStars = (rating: number) => (
    <View style={{ flexDirection: 'row' }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={16} color={i <= rating ? '#FFD700' : COLORS.neutral.grey200} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 리뷰</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 리뷰</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReviews();}} />}
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
            <Text style={styles.emptySubtext}>모임에 참여 후 리뷰를 남겨보세요!</Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {reviews.map(review => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewItem}
                onPress={() => navigation.navigate('MeetupDetail', { meetupId: review.meetup_id })}
              >
                <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
                <Text style={styles.hostName}>호스트: {review.host_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                  {renderStars(review.rating)}
                  <Text style={{ marginLeft: 8, fontSize: 14, color: COLORS.text.secondary }}>
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
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  reviewItem: {
    backgroundColor: COLORS.neutral.white, borderRadius: 12, padding: 16, marginBottom: 12, ...SHADOWS.small,
  },
  meetupTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: 4 },
  hostName: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 8 },
  comment: { fontSize: 14, color: COLORS.text.primary, lineHeight: 20 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14, color: COLORS.text.secondary, marginTop: 8, textAlign: 'center',
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80,
  },
  errorText: {
    fontSize: 16, color: COLORS.text.secondary, marginTop: 16, textAlign: 'center',
  },
  retryButton: {
    marginTop: 16, backgroundColor: COLORS.primary.main, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14, fontWeight: '600', color: COLORS.neutral.white,
  },
});

export default UniversalMyReviewsScreen;