import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { Heart, ArrowLeft, Clock, Users, MapPin } from 'lucide-react';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { MeetupCardSkeleton } from '../components/skeleton';

interface WishlistItem {
  wishlist_id: string;
  wishlisted_at: string;
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  category: string;
  max_participants: number;
  current_participants: number;
  deposit_amount: number;
  image?: string;
  status: string;
  host_name: string;
  host_profile_image?: string;
  is_ended: boolean;
  created_at: string;
}

const WishlistScreen: React.FC = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.get('/user/wishlists', {
        params: { page: 1, limit: 50 }
      });

      if (response.data && response.data.success) {
        setWishlist(response.data.data || []);
      } else {
        setWishlist([]);
      }
    } catch (err) {
      setWishlist([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (meetupId: string) => {
    try {
      const response = await apiClient.delete(`/meetups/${meetupId}/wishlist`);

      if (response.data && response.data.success) {
        setWishlist(prev => prev.filter(item => item.id !== meetupId));
      }
    } catch (error) {
      // silently fail
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours) || 0, parseInt(minutes) || 0);
    return time.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusText = (item: WishlistItem) => {
    if (item.is_ended) {
      return '이미 종료된 약속';
    }
    switch (item.status) {
      case '모집중': return '모집 중';
      case '모집완료': return '모집 완료';
      case '진행중': return '진행 중';
      case '종료': return '종료됨';
      case '취소': return '취소됨';
      default: return item.status;
    }
  };

  const getStatusColor = (item: WishlistItem) => {
    if (item.is_ended) {
      return COLORS.text.tertiary;
    }
    switch (item.status) {
      case '모집중': return COLORS.secondary.main;
      case '모집완료': return COLORS.primary.main;
      case '진행중': return COLORS.functional.success;
      case '종료': return COLORS.text.tertiary;
      case '취소': return COLORS.text.error;
      default: return COLORS.text.secondary;
    }
  };

  const renderWishlistItem = (item: WishlistItem) => (
    <div
      key={item.wishlist_id}
      style={{
        transition: 'all 200ms ease',
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 16,
      }}
      onMouseEnter={(e) => {
        if (!item.is_ended) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(17,17,17,0.08), 0 4px 12px rgba(17,17,17,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
    <TouchableOpacity
      style={[
        styles.wishlistCard,
        item.is_ended && styles.endedCard
      ]}
      onPress={() => navigate(`/meetup/${item.id}`)}
    >
      {/* 모임 이미지 */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.meetupImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="utensils" size={32} color={COLORS.text.tertiary} />
          </View>
        )}

        {/* 종료 오버레이 */}
        {item.is_ended && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedText}>종료된 약속</Text>
          </View>
        )}
      </View>

      {/* 모임 정보 */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[
            styles.cardTitle,
            item.is_ended && styles.endedTitle
          ]}>
            {item.title}
          </Text>
          <TouchableOpacity
            style={styles.heartButton}
            onPress={(e) => {
              e.stopPropagation();
              removeFromWishlist(item.id);
            }}
          >
            <Heart
              size={18}
              color={COLORS.functional.error}
              fill={COLORS.functional.error}
            />
          </TouchableOpacity>
        </View>

        <Text style={[
          styles.cardCategory,
          item.is_ended && styles.endedText
        ]}>
          {item.category}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Clock size={14} color={item.is_ended ? COLORS.text.tertiary : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {formatDate(item.date)} {formatTime(item.time)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={14} color={item.is_ended ? COLORS.text.tertiary : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {item.location}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Users size={14} color={item.is_ended ? COLORS.text.tertiary : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {item.current_participants ?? 0}/{item.max_participants ?? 4}명
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item) + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(item) }
            ]}>
              {getStatusText(item)}
            </Text>
          </View>

          {item.deposit_amount > 0 && (
            <Text style={[
              styles.depositText,
              item.is_ended && styles.endedText
            ]}>
              약속금 3,000원
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate(-1)}
          >
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>찜 목록</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <MeetupCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate(-1)}
          >
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>찜 목록</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState
          title="위시리스트를 불러올 수 없습니다"
          description="네트워크 상태를 확인하고 다시 시도해주세요"
          onRetry={fetchWishlist}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate(-1)}
        >
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>찜 목록</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 통계 정보 */}
      {wishlist.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{wishlist.length}</Text>
            <Text style={styles.statLabel}>총 찜한 약속</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {wishlist.filter(item => !item.is_ended).length}
            </Text>
            <Text style={styles.statLabel}>참여 가능한 약속</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {wishlist.length === 0 ? (
          <EmptyState
            variant="no-data"
            icon="heart"
            title="아직 찜한 약속이 없어요"
            description="마음에 드는 밥약속을 찜해보세요! 언제든지 다시 확인할 수 있어요."
            actionLabel="약속 찾아보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.wishlistGrid}>
            <Text style={styles.sectionTitle}>저장한 약속 ({wishlist.length}개)</Text>
            {wishlist.map(renderWishlistItem)}
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
  skeletonWrap: {
    padding: 20,
    gap: 16,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.sticky,
    zIndex: 10,
    paddingTop: 20,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },

  // 통계
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    ...SHADOWS.small,
    // @ts-ignore
    backgroundImage: `linear-gradient(145deg, ${COLORS.primary.light} 0%, ${COLORS.neutral.white} 100%)`,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary.dark,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // 컨텐츠
  content: {
    flex: 1,
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // 찜 목록
  wishlistGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },

  // 찜 카드
  wishlistCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.medium,
  },
  endedCard: {
    opacity: 0.7,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  meetupImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.neutral.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // 카드 컨텐츠
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginRight: 12,
    letterSpacing: -0.2,
  },
  endedTitle: {
    color: COLORS.text.tertiary,
  },
  heartButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },

  // 메타 정보
  cardMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },

  // 카드 푸터
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  depositText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});

export default WishlistScreen;