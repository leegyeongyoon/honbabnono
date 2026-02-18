import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';

interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
  category: 'activity' | 'social' | 'achievement';
}

const MyBadgesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // 뱃지 목록 설정 (실제로는 API에서 가져올 예정)
    const mockBadges: Badge[] = [
      {
        id: '1',
        emoji: '🥇',
        title: '첫걸음',
        description: '첫 모임 참여 완료',
        earned: true,
        earnedDate: '2023-10-01',
        category: 'activity'
      },
      {
        id: '2', 
        emoji: '🤝',
        title: '밥친구',
        description: '5회 이상 모임 참여',
        earned: true,
        earnedDate: '2023-10-15',
        category: 'social'
      },
      {
        id: '3',
        emoji: '⭐',
        title: '우수회원',
        description: '모임 평점 4.5 이상 달성',
        earned: true,
        earnedDate: '2023-10-20',
        category: 'achievement'
      },
      {
        id: '4',
        emoji: '🔥',
        title: '열정가',
        description: '한 달에 10회 이상 모임 참여',
        earned: false,
        category: 'activity'
      },
      {
        id: '5',
        emoji: '👑',
        title: '호스트 킹',
        description: '성공적인 모임 호스팅 20회 달성',
        earned: false,
        category: 'achievement'
      },
      {
        id: '6',
        emoji: '💎',
        title: '다이아몬드',
        description: '밥알지수 90 이상 달성',
        earned: false,
        category: 'achievement'
      },
      {
        id: '7',
        emoji: '🎯',
        title: '정시러',
        description: '모임에 항상 정시 참석',
        earned: false,
        category: 'social'
      },
      {
        id: '8',
        emoji: '🎉',
        title: '파티피플',
        description: '다양한 카테고리 모임 참여',
        earned: false,
        category: 'social'
      }
    ];

    setBadges(mockBadges);
  }, []);

  const earnedBadges = badges.filter(badge => badge.earned);
  const notEarnedBadges = badges.filter(badge => !badge.earned);

  const BadgeCard: React.FC<{ badge: Badge }> = ({ badge }) => (
    <View style={[
      styles.badgeCard, 
      badge.earned ? styles.earnedBadge : styles.notEarnedBadge
    ]}>
      <Text style={[
        styles.badgeEmoji, 
        !badge.earned && styles.notEarnedEmoji
      ]}>
        {badge.emoji}
      </Text>
      <Text style={[
        styles.badgeTitle,
        !badge.earned && styles.notEarnedTitle
      ]}>
        {badge.title}
      </Text>
      <Text style={[
        styles.badgeDescription,
        !badge.earned && styles.notEarnedDescription
      ]}>
        {badge.description}
      </Text>
      {badge.earned && badge.earnedDate && (
        <Text style={styles.earnedDate}>
          {new Date(badge.earnedDate).toLocaleDateString('ko-KR')} 획득
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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

        {/* 획득한 뱃지 */}
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

        {/* 미획득 뱃지 */}
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
  
  bottomSpacing: {
    height: 40,
  },
});

export default MyBadgesScreen;