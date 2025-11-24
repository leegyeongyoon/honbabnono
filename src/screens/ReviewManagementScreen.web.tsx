import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
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
        console.error('관리 가능한 리뷰 조회 실패:', error);
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
              console.error('리뷰 삭제 실패:', error);
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
      console.error('리뷰 추천 상태 변경 실패:', error);
      Alert.alert('오류', '리뷰 추천 상태 변경에 실패했습니다.');
    }
  };

  const getFilteredReviews = () => {
    switch (selectedFilter) {
      case 'featured':
        return reviews.filter(review => review.is_featured);
      case 'recent':
        return reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
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
          color={i <= rating ? "#FFD700" : "#E0E0E0"}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewItem = (review: ManageableReview) => (
    <TouchableOpacity
      key={review.id}
      style={styles.reviewItem}
      onPress={() => navigate(`/review/${review.id}`)}
    >
      <View style={styles.profileImage}>
        <View style={[styles.avatarCircle, review.is_featured && styles.featuredAvatar]}>
          <Text style={styles.avatarText}>
            {review.is_featured ? '⭐' : '📝'}
          </Text>
        </View>
      </View>

      <View style={styles.reviewInfo}>
        <Text style={styles.reviewTitle}>{review.meetup_title}</Text>
        <View style={styles.ratingContainer}>
          {renderStars(review.rating)}
          <Text style={styles.ratingText}>({review.rating}.0)</Text>
        </View>
        <Text style={styles.reviewContent} numberOfLines={2}>
          {review.content}
        </Text>
        <View style={styles.reviewMeta}>
          <Text style={styles.metaText}>
            {new Date(review.created_at).toLocaleDateString()} • 
            좋아요 {review.like_count} • 댓글 {review.reply_count}
          </Text>
        </View>
      </View>

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
            size={16} 
            color={review.is_featured ? COLORS.primary.main : COLORS.text.secondary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            navigate(`/review/${review.id}/edit`);
          }}
        >
          <Icon name="edit" size={16} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteReview(review.id);
          }}
        >
          <Icon name="trash-2" size={16} color={COLORS.text.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredReviews = getFilteredReviews();

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>리뷰를 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>리뷰 관리</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigate('/write-review')}
        >
          <Icon name="plus" size={24} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>

      {/* 필터 버튼 */}
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

      <ScrollView style={styles.content}>
        {filteredReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="star" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'featured' ? '추천 리뷰가 없습니다' : '작성한 리뷰가 없습니다'}
            </Text>
            <Text style={styles.emptyDescription}>
              참여한 모임에 대한 리뷰를 작성해보세요!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/my-meetups')}
            >
              <Text style={styles.exploreButtonText}>내 모임 보기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            <Text style={styles.sectionTitle}>
              {selectedFilter === 'all' ? '전체 리뷰' : 
               selectedFilter === 'featured' ? '추천 리뷰' : '최근 작성한 리뷰'} 
              ({filteredReviews.length}개)
            </Text>
            {filteredReviews.map(renderReviewItem)}
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
  addButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.neutral.grey100,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary.main,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.text.white,
    fontWeight: '600',
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
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 20,
    paddingBottom: 0,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  featuredAvatar: {
    backgroundColor: '#FFD700',
  },
  avatarText: {
    fontSize: 20,
  },
  reviewInfo: {
    flex: 1,
    marginRight: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  reviewContent: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
  },
  featuredButton: {
    backgroundColor: COLORS.primary.light,
  },
});

export default ReviewManagementScreen;