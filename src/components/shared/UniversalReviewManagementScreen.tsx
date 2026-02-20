import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface Review {
  id: string;
  meetup_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  meetup_id: string;
  can_reply: boolean;
  reply?: string;
}

const UniversalReviewManagementScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({
  navigation, user
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const fetchReviews = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/user/reviews/received`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (_error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const replyToReview = (reviewId: string) => {
    Alert.prompt(
      '리뷰 답변',
      '답변을 작성해주세요:',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '답변',
          onPress: async (text) => {
            if (!text?.trim()) {return;}

            try {
              const token = await AsyncStorage.getItem('authToken');
              await fetch(`${getApiUrl()}/reviews/${reviewId}/reply`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reply: text }),
              });

              setReviews(prev => prev.map(review =>
                review.id === reviewId ? { ...review, reply: text } : review
              ));
            } catch (_error) {
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderStars = (rating: number) => (
    <View style={styles.starsContainer}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={14} color={i <= rating ? COLORS.primary.accent : COLORS.neutral.grey200} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>받은 리뷰</Text>
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
        <Text style={styles.headerTitle}>받은 리뷰</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReviews();}} tintColor={COLORS.primary.accent} colors={[COLORS.primary.accent]} />}
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="star" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>받은 리뷰가 없습니다</Text>
            <Text style={styles.emptySubtext}>약속을 호스팅하면 리뷰를 받을 수 있어요</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {reviews.map(review => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>

                <View style={styles.reviewerRow}>
                  <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                  <View style={styles.starsWrapper}>
                    {renderStars(review.rating)}
                  </View>
                </View>

                <Text style={styles.comment}>{review.comment}</Text>

                {review.reply ? (
                  <View style={styles.replyContainer}>
                    <Icon name="corner-down-right" size={14} color={COLORS.text.tertiary} />
                    <Text style={styles.reply}>{review.reply}</Text>
                  </View>
                ) : review.can_reply && (
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => replyToReview(review.id)}
                  >
                    <Icon name="message-circle" size={16} color={COLORS.primary.accent} />
                    <Text style={styles.replyButtonText}>답변하기</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.1,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starsWrapper: {
    marginLeft: 8,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginVertical: 6,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral.background,
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  reply: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.accent,
    borderRadius: 6,
    paddingVertical: 8,
    marginTop: 10,
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
});

export default UniversalReviewManagementScreen;
