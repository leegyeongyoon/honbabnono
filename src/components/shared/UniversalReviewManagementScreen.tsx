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
    } catch (error) {
      console.error('리뷰 조회 실패:', error);
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
            if (!text?.trim()) return;
            
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
            } catch (error) {
              console.error('답변 작성 실패:', error);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderStars = (rating: number) => (
    <View style={{ flexDirection: 'row' }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={14} color={i <= rating ? '#FFD700' : COLORS.neutral.grey200} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>받은 리뷰</Text>
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
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>받은 리뷰</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReviews();}} />}
      >
        {reviews.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Icon name="star" size={48} color={COLORS.text.tertiary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 }}>
              받은 리뷰가 없습니다
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {reviews.map(review => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                  <View style={{ marginLeft: 8 }}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                
                <Text style={styles.comment}>{review.comment}</Text>
                
                {review.reply ? (
                  <View style={styles.replyContainer}>
                    <Icon name="corner-down-right" size={16} color={COLORS.text.secondary} />
                    <Text style={styles.reply}>{review.reply}</Text>
                  </View>
                ) : review.can_reply && (
                  <TouchableOpacity 
                    style={styles.replyButton}
                    onPress={() => replyToReview(review.id)}
                  >
                    <Icon name="message-circle" size={16} color={COLORS.primary.main} />
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
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  meetupTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, flex: 1, marginRight: 8 },
  reviewDate: { fontSize: 12, color: COLORS.text.secondary },
  reviewerName: { fontSize: 14, fontWeight: '500', color: COLORS.text.primary },
  comment: { fontSize: 14, color: COLORS.text.primary, lineHeight: 20, marginVertical: 8 },
  replyContainer: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.neutral.background,
    padding: 12, borderRadius: 8, marginTop: 8, gap: 8,
  },
  reply: { fontSize: 14, color: COLORS.text.secondary, flex: 1, lineHeight: 20 },
  replyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary.main, borderRadius: 8,
    paddingVertical: 8, marginTop: 8, gap: 4,
  },
  replyButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary.main },
});

export default UniversalReviewManagementScreen;