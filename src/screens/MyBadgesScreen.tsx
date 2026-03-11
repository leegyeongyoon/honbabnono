import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  required_count: number;
  earned: boolean;
  earned_at?: string;
  currentProgress: number;
  progressPercent: number;
}

const CATEGORY_EMOJI: Record<string, string> = {
  meetup_count: '🍽️',
  review_count: '📝',
  host_count: '👑',
  streak: '🔥',
  social: '🤝',
  achievement: '⭐',
};

const safeGoBack = (navigation: any) => {
  try {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  } catch {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.back();
    }
  }
};

const MyBadgesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/badges/progress');

      if (response.data && response.data.success) {
        setBadges(response.data.progress || []);
      } else {
        setBadges([]);
      }
    } catch (_error) {
      setError('뱃지 정보를 불러오지 못했습니다');
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadges = badges.filter(badge => badge.earned);
  const notEarnedBadges = badges.filter(badge => !badge.earned);

  const getBadgeEmoji = (badge: Badge): string => {
    if (badge.icon) return badge.icon;
    return CATEGORY_EMOJI[badge.category] || '🏅';
  };

  const BadgeCard: React.FC<{ badge: Badge }> = ({ badge }) => (
    <View style={[
      styles.badgeCard,
      badge.earned ? styles.earnedBadge : styles.notEarnedBadge
    ]}>
      <Text style={[
        styles.badgeEmoji,
        !badge.earned && styles.notEarnedEmoji
      ]}>
        {getBadgeEmoji(badge)}
      </Text>
      <Text style={[
        styles.badgeTitle,
        !badge.earned && styles.notEarnedTitle
      ]}>
        {badge.name}
      </Text>
      <Text style={[
        styles.badgeDescription,
        !badge.earned && styles.notEarnedDescription
      ]}>
        {badge.description}
      </Text>
      {badge.earned && badge.earned_at && (
        <Text style={styles.earnedDate}>
          {new Date(badge.earned_at).toLocaleDateString('ko-KR')} 획득
        </Text>
      )}
      {!badge.earned && badge.required_count > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${badge.progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {badge.currentProgress}/{badge.required_count}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(navigation)}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 뱃지</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, height: 80, borderRadius: 8, backgroundColor: '#EFECEA' }} />
            <View style={{ flex: 1, height: 80, borderRadius: 8, backgroundColor: '#EFECEA' }} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: '48%', height: 140, borderRadius: 8, backgroundColor: '#F7F5F3' }} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(navigation)}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 뱃지</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBadges}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
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
          onPress={() => safeGoBack(navigation)}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 뱃지</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 통계 섹션 */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{earnedBadges.length}</Text>
            <Text style={styles.statLabel}>획득한 뱃지</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{badges.length}</Text>
            <Text style={styles.statLabel}>전체 뱃지</Text>
          </View>
        </View>

        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏅</Text>
            <Text style={styles.emptyStateText}>뱃지가 아직 없습니다</Text>
            <Text style={styles.emptyStateSubtext}>약속에 참여하고 뱃지를 획득해보세요!</Text>
          </View>
        ) : (
          <>
            {/* 획득한 뱃지 */}
            {earnedBadges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  획득한 뱃지 ({earnedBadges.length})
                </Text>
                <View style={styles.badgeGrid}>
                  {earnedBadges.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </View>
              </View>
            )}

            {/* 미획득 뱃지 */}
            {notEarnedBadges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  미획득 뱃지 ({notEarnedBadges.length})
                </Text>
                <View style={styles.badgeGrid}>
                  {notEarnedBadges.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
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
    ...SHADOWS.sticky,
    zIndex: 10,
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
  
  // 컨텐츠
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // 통계
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,14,12,0.06)',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  // 섹션
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  // 뱃지 카드
  badgeCard: {
    width: '48%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,14,12,0.06)',
    ...SHADOWS.small,
  },
  earnedBadge: {
    backgroundColor: COLORS.neutral.white,
  },
  notEarnedBadge: {
    backgroundColor: COLORS.neutral.light,
    opacity: 0.7,
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  notEarnedEmoji: {
    opacity: 0.4,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  notEarnedTitle: {
    color: COLORS.text.secondary,
  },
  badgeDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  notEarnedDescription: {
    color: COLORS.text.disabled,
  },
  earnedDate: {
    fontSize: 11,
    color: COLORS.primary.accent,
    fontWeight: '500',
  },

  // 진행률
  progressContainer: {
    width: '100%',
    marginTop: 4,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(15,14,12,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.text.disabled,
    marginTop: 4,
  },

  // 에러 상태
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral.white,
    backgroundColor: COLORS.functional.error,
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // 빈 상태
  emptyState: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  bottomSpacing: {
    height: 40,
  },
});

export default MyBadgesScreen;