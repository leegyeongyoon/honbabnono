import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { ArrowLeft, Clock, Users, MapPin, Trash2 } from 'lucide-react';
import apiClient from '../services/apiClient';

interface RecentViewItem {
  id: string;
  viewed_at: string;
  meetup_id: string;
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

const RecentViewsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentViews();
  }, []);

  const fetchRecentViews = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user/recent-views', {
        params: { page: 1, limit: 50 }
      });

      if (response.data && response.data.success) {
        setRecentViews(response.data.data || []);
      } else {
        setRecentViews([]);
      }
    } catch (error) {
      setRecentViews([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromRecentViews = async (viewId: string) => {
    try {
      const response = await apiClient.delete(`/user/recent-views/${viewId}`);

      if (response.data && response.data.success) {
        setRecentViews(prev => prev.filter(item => item.id !== viewId));
      }
    } catch (error) {
      // silently fail
    }
  };

  const clearAllRecentViews = async () => {
    try {
      const response = await apiClient.delete('/user/recent-views');

      if (response.data && response.data.success) {
        setRecentViews([]);
      }
    } catch (error) {
      // silently fail
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };

  const formatMeetupDate = (dateString: string) => {
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

  const getStatusText = (item: RecentViewItem) => {
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

  const getStatusColor = (item: RecentViewItem) => {
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

  const renderRecentViewItem = (item: RecentViewItem) => (
    <div
      key={item.id}
      onMouseEnter={(e) => {
        if (!item.is_ended) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(17,17,17,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
      style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
    >
      <TouchableOpacity
        style={[
          styles.recentViewCard,
          item.is_ended && styles.endedCard
        ]}
        onPress={() => navigate(`/meetup/${item.meetup_id}`)}
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
            <Text style={styles.endedOverlayText}>종료된 약속</Text>
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
            style={styles.removeButton}
            onPress={(e) => {
              e.stopPropagation();
              removeFromRecentViews(item.id);
            }}
          >
            <Trash2 size={16} color={COLORS.text.secondary} />
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
              {formatMeetupDate(item.date)} {formatTime(item.time)}
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

          <Text style={styles.viewedAtText}>
            {formatDate(item.viewed_at)} 조회
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>최근 본 글</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="animate-shimmer" style={{ flexDirection: 'row', padding: 16, backgroundColor: '#FAFAF8', borderRadius: 8, gap: 12 }}>
              <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#EFECEA' }} />
              <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                <View style={{ width: '70%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
                <View style={{ width: '50%', height: 10, borderRadius: 5, backgroundColor: '#EFECEA' }} />
                <View style={{ width: '40%', height: 10, borderRadius: 5, backgroundColor: '#EFECEA' }} />
              </View>
            </View>
          ))}
        </View>
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
        <Text style={styles.headerTitle}>최근 본 글</Text>
        {recentViews.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={clearAllRecentViews}
          >
            <Text style={styles.clearAllText}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 통계 정보 */}
      {recentViews.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{recentViews.length}</Text>
            <Text style={styles.statLabel}>최근 본 글</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {recentViews.filter(item => !item.is_ended).length}
            </Text>
            <Text style={styles.statLabel}>참여 가능한 약속</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {recentViews.length === 0 ? (
          <EmptyState
            icon="clock"
            title="아직 본 글이 없어요"
            description="밥약속을 둘러보고 관심있는 약속을 확인해보세요! 최근 본 글 내역이 여기에 표시됩니다."
            actionLabel="약속 둘러보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.recentViewsGrid}>
            <Text style={styles.sectionTitle}>최근 본 글 ({recentViews.length}개)</Text>
            {recentViews.map(renderRecentViewItem)}
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

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 84, 78, 0.08)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.text.error,
    fontWeight: '600',
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
    backgroundColor: COLORS.neutral.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    ...CARD_STYLE,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary.dark,
    marginBottom: 4,
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

  // 최근 본 글 목록
  recentViewsGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },

  // 최근 본 글 카드
  recentViewCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    ...CARD_STYLE,
    ...SHADOWS.small,
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
  endedOverlayText: {
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
  },
  endedTitle: {
    color: COLORS.text.tertiary,
  },
  removeButton: {
    padding: 4,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  cardCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  endedText: {
    color: COLORS.text.tertiary,
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
    fontWeight: '500',
  },
  viewedAtText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
});

export default RecentViewsScreen;