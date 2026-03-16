import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { ProfileImage } from '../components/ProfileImage';
import userApiService from '../services/userApiService';

// 바발스코어 등급 색상 매핑
const BABAL_LEVEL_COLORS: Record<string, string> = {
  '밥알 전설': '#D4882C',
  '밥알 고수': '#7B5EA7',
  '단골 밥친구': '#1976D2',
  '밥친구': '#2E7D4F',
  '새싹': '#9E9E9E',
  '주의': '#D32F2F',
};

const getBabalLevelColor = (label: string): string => {
  return BABAL_LEVEL_COLORS[label] || COLORS.text.secondary;
};

interface HostProfile {
  id: string;
  name: string;
  profileImage: string | null;
  babalScore: number;
  babalLevel: {
    level: number;
    label: string;
    color: string;
    description: string;
  };
  gender: string | null;
  createdAt: string;
}

interface HostStats {
  totalHosted: number;
  completedHosted: number;
  cancelledHosted: number;
  completionRate: number;
  avgRating: number | null;
  totalReviews: number;
}

interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  tags: string[];
  is_anonymous: boolean;
  created_at: string;
  meetup_title: string;
  reviewer_name: string;
  profile_image: string | null;
  reviewer_id: string | null;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned_at: string;
  is_featured: boolean;
}

interface MeetupItem {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  time: string;
  max_participants: number;
  current_participants: number;
  status: string;
  image: string | null;
  price_range: string | null;
}

const BADGE_ICON_MAP: Record<string, string> = {
  'first-meetup': '🎉',
  'regular': '🏠',
  'meetup-king': '👑',
  'host-beginner': '🍳',
  'host-pro': '🧑‍🍳',
  'reviewer': '📝',
  'early-bird': '🐦',
  'night-owl': '🦉',
  'social-butterfly': '🦋',
  'no-show-free': '✅',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '모집중': { bg: COLORS.functional.successLight, text: COLORS.functional.success },
  '모집완료': { bg: COLORS.functional.infoLight, text: COLORS.functional.info },
  '진행중': { bg: COLORS.functional.warningLight, text: COLORS.functional.warning },
  '완료': { bg: '#F5F5F5', text: COLORS.text.secondary },
  '취소': { bg: COLORS.functional.errorLight, text: COLORS.functional.error },
};

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Icon
        key={i}
        name="star"
        size={14}
        color={i <= rating ? COLORS.functional.warning : COLORS.neutral.grey200}
      />
    );
  }
  return stars;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

const formatFullDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

const HostProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = route.params?.userId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [stats, setStats] = useState<HostStats | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [recentMeetups, setRecentMeetups] = useState<MeetupItem[]>([]);

  const fetchHostProfile = useCallback(async () => {
    if (!userId) { return; }
    try {
      setLoading(true);
      setError(null);
      const data = await userApiService.getHostProfile(userId);
      setProfile(data.profile);
      setStats(data.stats);
      setReviews(data.reviews || []);
      setBadges(data.badges || []);
      setRecentMeetups(data.recentMeetups || []);
    } catch (_err) {
      setError('호스트 프로필을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHostProfile();
  }, [fetchHostProfile]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>호스트 프로필</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  if (error || !profile || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>호스트 프로필</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
          <Text style={styles.errorText}>{error || '프로필을 불러올 수 없습니다.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHostProfile}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const levelColor = getBabalLevelColor(profile.babalLevel.label);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>호스트 프로필</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 프로필 섹션 */}
        <View style={styles.profileCard}>
          <View style={styles.profileSection}>
            <ProfileImage
              profileImage={profile.profileImage}
              name={profile.name}
              size={88}
            />
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <View style={[styles.babalBadge, { backgroundColor: levelColor + '15', borderColor: levelColor + '30' }]}>
                <Text style={[styles.babalScoreText, { color: levelColor }]}>
                  {profile.babalScore} {profile.babalLevel.label}
                </Text>
              </View>
              <View style={styles.joinDateRow}>
                <Icon name="calendar" size={12} color={COLORS.text.tertiary} />
                <Text style={styles.joinDateText}>
                  {formatDate(profile.createdAt)} 가입
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: COLORS.primary.light }]}>
                <Icon name="users" size={18} color={COLORS.primary.main} />
              </View>
              <Text style={styles.statNumber}>{stats.totalHosted}</Text>
              <Text style={styles.statLabel}>주최 모임</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: COLORS.functional.warningLight }]}>
                <Icon name="star" size={18} color={COLORS.functional.warning} />
              </View>
              <Text style={styles.statNumber}>
                {stats.avgRating ? stats.avgRating.toFixed(1) : '-'}
              </Text>
              <Text style={styles.statLabel}>평균 평점</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: COLORS.functional.successLight }]}>
                <Icon name="check-circle" size={18} color={COLORS.functional.success} />
              </View>
              <Text style={styles.statNumber}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>완료율</Text>
            </View>
          </View>
        </View>

        {/* 뱃지 섹션 */}
        {badges.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="award" size={18} color={COLORS.primary.main} />
              <Text style={styles.sectionTitle}>획득 뱃지</Text>
              <Text style={styles.sectionCount}>{badges.length}개</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.badgeList}>
                {badges.map((badge) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <View style={styles.badgeIconCircle}>
                      <Text style={styles.badgeIcon}>
                        {BADGE_ICON_MAP[badge.icon] || '🏅'}
                      </Text>
                    </View>
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 받은 리뷰 섹션 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="message-circle" size={18} color={COLORS.primary.main} />
            <Text style={styles.sectionTitle}>받은 리뷰</Text>
            <Text style={styles.sectionCount}>{stats.totalReviews}개</Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 받은 리뷰가 없습니다</Text>
            </View>
          ) : (
            <>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <ProfileImage
                        profileImage={review.profile_image}
                        name={review.reviewer_name}
                        size={32}
                      />
                      <View style={styles.reviewerTextContainer}>
                        <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                        <Text style={styles.reviewDate}>{formatFullDate(review.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  {review.content ? (
                    <Text style={styles.reviewContent}>{review.content}</Text>
                  ) : null}
                  {review.meetup_title ? (
                    <View style={styles.reviewMeetupTag}>
                      <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
                      <Text style={styles.reviewMeetupTitle} numberOfLines={1}>
                        {review.meetup_title}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          )}
        </View>

        {/* 최근 주최 모임 섹션 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar" size={18} color={COLORS.primary.main} />
            <Text style={styles.sectionTitle}>최근 주최 모임</Text>
          </View>

          {recentMeetups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 주최한 모임이 없습니다</Text>
            </View>
          ) : (
            <>
              {recentMeetups.map((meetup) => {
                const statusColor = STATUS_COLORS[meetup.status] || STATUS_COLORS['완료'];
                return (
                  <TouchableOpacity
                    key={meetup.id}
                    onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
                    activeOpacity={0.7}
                    style={styles.meetupCard}
                  >
                    <View style={styles.meetupCardContent}>
                      <View style={styles.meetupInfo}>
                        <View style={styles.meetupTitleRow}>
                          <Text style={styles.meetupTitle} numberOfLines={1}>
                            {meetup.title}
                          </Text>
                          <View style={[styles.meetupStatusBadge, { backgroundColor: statusColor.bg }]}>
                            <Text style={[styles.meetupStatusText, { color: statusColor.text }]}>
                              {meetup.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.meetupMetaRow}>
                          <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
                          <Text style={styles.meetupMeta} numberOfLines={1}>
                            {meetup.location}
                          </Text>
                        </View>
                        <View style={styles.meetupMetaRow}>
                          <Icon name="calendar" size={12} color={COLORS.text.tertiary} />
                          <Text style={styles.meetupMeta}>
                            {formatFullDate(meetup.date)}
                          </Text>
                          <Text style={styles.meetupMetaDot}>.</Text>
                          <Icon name="users" size={12} color={COLORS.text.tertiary} />
                          <Text style={styles.meetupMeta}>
                            {meetup.current_participants}/{meetup.max_participants}명
                          </Text>
                        </View>
                      </View>
                      <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  // Profile section
  profileCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileTextContainer: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  babalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  babalScoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  joinDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinDateText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  // Stats
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.neutral.grey100,
  },
  // Section
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  // Badges
  badgeList: {
    flexDirection: 'row',
    gap: 4,
  },
  badgeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    paddingVertical: 8,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeIcon: {
    fontSize: 22,
  },
  badgeName: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  // Reviews
  reviewCard: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reviewerTextContainer: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewContent: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewMeetupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewMeetupTitle: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  // Meetups
  meetupCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  meetupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meetupInfo: {
    flex: 1,
    gap: 4,
  },
  meetupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  meetupStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meetupStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meetupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meetupMeta: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  meetupMetaDot: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginHorizontal: 2,
  },
});

export default HostProfileScreen;
