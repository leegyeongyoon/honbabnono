import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface Review {
  id: string;
  rating: number;
  content: string;
  images: string[];
  created_at: string;
  meetup_title: string;
  meetup_date: string;
  meetup_location: string;
}

const MyReviewsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/reviews');
        setReviews(response.data.reviews);
      } catch (error) {
        console.error('내 리뷰 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? "star" : "star"}
          size={16}
          color={i <= rating ? "#FFD700" : COLORS.neutral.grey200}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReview = (review: Review) => (
    <TouchableOpacity
      key={review.id}
      style={styles.reviewItem}
    >
      <View style={styles.profileImage}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>⭐</Text>
        </View>
      </View>

      <View style={styles.reviewInfo}>
        <Text style={styles.reviewTitle}>{review.meetup_title}</Text>
        <View style={styles.ratingRow}>
          {renderStars(review.rating)}
          <Text style={styles.ratingText}>({review.rating}.0)</Text>
        </View>
        <View style={styles.reviewMeta}>
          <Text style={styles.metaText}>
            {review.meetup_location} • {new Date(review.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>내 리뷰를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 리뷰</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="star" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>작성한 리뷰가 없습니다</Text>
            <Text style={styles.emptyDescription}>
              참여한 모임에 대한 리뷰를 작성해보세요!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/my-activities')}
            >
              <Text style={styles.exploreButtonText}>내 활동 보기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>리뷰 요약</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{reviews.length}</Text>
                  <Text style={styles.summaryLabel}>작성한 리뷰</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {reviews.length > 0 
                      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                      : '0.0'
                    }
                  </Text>
                  <Text style={styles.summaryLabel}>평균 평점</Text>
                </View>
              </View>
            </View>

            <View style={styles.reviewsListContainer}>
              <Text style={styles.listSectionTitle}>작성한 리뷰 ({reviews.length}개)</Text>
              {reviews.map(renderReview)}
            </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsList: {
    padding: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...SHADOWS.small,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.neutral.grey100,
    marginHorizontal: 20,
  },
  reviewsListContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 20,
    paddingBottom: 0,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});

export default MyReviewsScreen;