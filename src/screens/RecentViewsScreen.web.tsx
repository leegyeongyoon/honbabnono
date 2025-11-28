import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { ArrowLeft, Clock, Users, MapPin, Trash2, History } from 'lucide-react';
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
      console.log('📖 최근 본 글 목록 조회 시작');
      const response = await apiClient.get('/user/recent-views', {
        params: { page: 1, limit: 50 }
      });
      
      if (response.data && response.data.success) {
        setRecentViews(response.data.data || []);
        console.log('✅ 최근 본 글 목록 조회 성공:', response.data.data?.length, '건');
      } else {
        console.error('❌ 최근 본 글 목록 조회 실패:', response.data?.message || 'Unknown error');
        setRecentViews([]);
      }
    } catch (error) {
      console.error('❌ 최근 본 글 목록 조회 실패:', error);
      setRecentViews([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromRecentViews = async (viewId: string) => {
    try {
      console.log('🗑️ 최근 본 글 제거 시도:', viewId);
      const response = await apiClient.delete(`/user/recent-views/${viewId}`);
      
      if (response.data && response.data.success) {
        setRecentViews(prev => prev.filter(item => item.id !== viewId));
        console.log('✅ 최근 본 글 제거 성공');
      } else {
        console.error('❌ 최근 본 글 제거 실패:', response.data?.message);
      }
    } catch (error) {
      console.error('❌ 최근 본 글 제거 실패:', error);
    }
  };

  const clearAllRecentViews = async () => {
    try {
      console.log('🗑️ 전체 최근 본 글 삭제 시도');
      const response = await apiClient.delete('/user/recent-views');
      
      if (response.data && response.data.success) {
        setRecentViews([]);
        console.log('✅ 전체 최근 본 글 삭제 성공');
      } else {
        console.error('❌ 전체 최근 본 글 삭제 실패:', response.data?.message);
      }
    } catch (error) {
      console.error('❌ 전체 최근 본 글 삭제 실패:', error);
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
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusText = (item: RecentViewItem) => {
    if (item.is_ended) {
      return '이미 종료된 모임';
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
      return COLORS.text.disabled;
    }
    switch (item.status) {
      case '모집중': return COLORS.secondary.main;
      case '모집완료': return COLORS.primary.main;
      case '진행중': return COLORS.accent?.green || '#4CAF50';
      case '종료': return COLORS.text.disabled;
      case '취소': return COLORS.text.error;
      default: return COLORS.text.secondary;
    }
  };

  const renderRecentViewItem = (item: RecentViewItem) => (
    <TouchableOpacity
      key={item.id}
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
            <Text style={styles.placeholderText}>🍽️</Text>
          </View>
        )}
        
        {/* 종료 오버레이 */}
        {item.is_ended && (
          <View style={styles.endedOverlay}>
            <Text style={styles.endedOverlayText}>종료된 모임</Text>
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
            <Clock size={14} color={item.is_ended ? COLORS.text.disabled : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {formatMeetupDate(item.date)} {formatTime(item.time)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={14} color={item.is_ended ? COLORS.text.disabled : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {item.location}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Users size={14} color={item.is_ended ? COLORS.text.disabled : COLORS.text.secondary} />
            <Text style={[
              styles.metaText,
              item.is_ended && styles.endedText
            ]}>
              {item.current_participants}/{item.max_participants}명
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
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>최근 본 글을 불러오는 중...</Text>
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
            <Text style={styles.statLabel}>참여 가능한 모임</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {recentViews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>아직 본 글이 없어요</Text>
            <Text style={styles.emptyDescription}>
              모임을 둘러보고 관심있는 모임을 확인해보세요!{'\n'}최근 본 글 내역이 여기에 표시됩니다.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/home')}
            >
              <Text style={styles.exploreButtonText}>모임 둘러보기</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  clearAllButton: {
    padding: 8,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.text.error,
    fontWeight: '500',
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary.main,
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
  
  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // 최근 본 글 목록
  recentViewsGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  
  // 최근 본 글 카드
  recentViewCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
  placeholderText: {
    fontSize: 32,
  },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 12,
  },
  endedTitle: {
    color: COLORS.text.disabled,
  },
  removeButton: {
    padding: 4,
  },
  cardCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  endedText: {
    color: COLORS.text.disabled,
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
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});

export default RecentViewsScreen;