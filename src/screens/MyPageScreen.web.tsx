import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { useUserStore } from '../store/userStore';
import { Icon, IconName } from '../components/Icon';
import userApiService from '../services/userApiService';
import { ProfileImage } from '../components/ProfileImage';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ProfileSkeleton } from '../components/skeleton';
import { FadeIn } from '../components/animated';

interface UserType {
  id: string;
  name: string;
  email: string;
}

interface MyPageScreenProps {
  user?: UserType | null;
  onLogout?: () => void;
}

// 밥알지수 등급 계산
const getRiceGrade = (score: number): { label: string; emoji: string } => {
  if (score >= 86) return { label: '밥알마스터', emoji: '👑' };
  if (score >= 61) return { label: '밥알고수', emoji: '⭐' };
  if (score >= 31) return { label: '밥알친구', emoji: '🍚' };
  return { label: '밥알초보', emoji: '🌱' };
};

// 빠른 메뉴 아이템
interface QuickMenuItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
}

const QUICK_MENUS: QuickMenuItem[] = [
  { id: 'my-meetups', label: '내 모임', icon: 'calendar', path: '/my-meetups' },
  { id: 'wishlist', label: '찜 목록', icon: 'heart', path: '/wishlist' },
  { id: 'point-charge', label: '포인트', icon: 'credit-card', path: '/point-charge' },
  { id: 'my-reviews', label: '리뷰', icon: 'star', path: '/my-reviews' },
  { id: 'recent-views', label: '최근 본', icon: 'eye', path: '/recent-views' },
  { id: 'notification-settings', label: '설정', icon: 'settings', path: '/notification-settings' },
];

// 고객지원 메뉴
const SUPPORT_MENUS = [
  { id: 'notices', label: '공지사항', path: '/notices' },
  { id: 'faq', label: '자주 묻는 질문', path: '/faq' },
  { id: 'terms', label: '이용약관', path: '/terms' },
];

const MyPageScreen: React.FC<MyPageScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser, logout } = useUserStore();
  const user = propsUser || storeUser;

  const [userStats, setUserStats] = useState({
    riceIndex: 0,
    availablePoints: 0,
    totalMeetups: 0,
    hostedMeetups: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userProfileImageUrl, setUserProfileImageUrl] = useState(null);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const { dialog, confirmDanger, confirm } = useConfirmDialog();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const stats = await userApiService.getUserStats();
        const riceIndexResponse = await userApiService.getRiceIndex();
        setUserStats({
          ...stats,
          riceIndex: riceIndexResponse?.riceIndex || 0,
        });
        const userData = await userApiService.getProfile();
        setUserProfileImageUrl(userData.profileImage);
      } catch (error) {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    const confirmed = await confirm('로그아웃', '로그아웃 하시겠습니까?');
    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirmDanger('회원 탈퇴', '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (confirmed) {
      // TODO: 계정 삭제 API 호출
    }
  };

  const riceGrade = getRiceGrade(userStats.riceIndex);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>
        </View>
        <View style={styles.skeletonWrapper}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 프로필 카드 */}
        <FadeIn delay={0}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.profileImageWrapper}>
                <ProfileImage
                  profileImage={userProfileImageUrl}
                  name={user?.name || '사용자'}
                  size={80}
                />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name || '사용자'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => navigate('/mypage/edit')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editProfileText}>프로필 수정</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* 통계 카드 */}
        <FadeIn delay={50}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalMeetups}</Text>
              <Text style={styles.statLabel}>참여</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.hostedMeetups}</Text>
              <Text style={styles.statLabel}>주최</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.reviewCount}</Text>
              <Text style={styles.statLabel}>리뷰</Text>
            </View>
          </View>
        </FadeIn>

        {/* 포인트 배너 */}
        <FadeIn delay={75}>
          <TouchableOpacity
            style={styles.pointBanner}
            onPress={() => navigate('/point-charge')}
            activeOpacity={0.7}
          >
            <View style={styles.pointBannerLeft}>
              <Icon name="credit-card" size={20} color={COLORS.primary.main} />
              <Text style={styles.pointBannerLabel}>보유 포인트</Text>
            </View>
            <View style={styles.pointBannerRight}>
              <Text style={styles.pointBannerValue}>{userStats.availablePoints.toLocaleString()}P</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
            </View>
          </TouchableOpacity>
        </FadeIn>

        {/* 밥알지수 카드 */}
        <FadeIn delay={100}>
          <View style={styles.riceCard}>
            <View style={styles.riceHeader}>
              <Text style={styles.riceLabel}>밥알지수</Text>
              <Text style={styles.riceScore}>{userStats.riceIndex}점</Text>
            </View>
            <View style={styles.riceProgressBg}>
              <View
                style={[
                  styles.riceProgressFill,
                  { width: `${Math.min(userStats.riceIndex, 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.riceGradeText}>
              {riceGrade.emoji} {riceGrade.label}
            </Text>
          </View>
        </FadeIn>

        {/* 빠른 메뉴 (3x2 그리드) */}
        <FadeIn delay={150}>
          <View style={styles.quickMenuCard}>
            <View style={styles.quickMenuGrid}>
              {QUICK_MENUS.map((menu) => (
                <TouchableOpacity
                  key={menu.id}
                  style={styles.quickMenuItem}
                  onPress={() => navigate(menu.path)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickMenuIconBox}>
                    <Icon name={menu.icon} size={24} color={COLORS.primary.main} />
                  </View>
                  <Text style={styles.quickMenuLabel}>{menu.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeIn>

        {/* 고객지원 (접힌 목록) */}
        <FadeIn delay={200}>
          <View style={styles.supportCard}>
            <TouchableOpacity
              style={styles.supportHeader}
              onPress={() => setSupportExpanded(!supportExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.supportTitle}>고객지원</Text>
              <Icon
                name={supportExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.text.secondary}
              />
            </TouchableOpacity>
            {supportExpanded && (
              <View style={styles.supportList}>
                {SUPPORT_MENUS.map((menu, idx) => (
                  <TouchableOpacity
                    key={menu.id}
                    style={[
                      styles.supportItem,
                      idx === SUPPORT_MENUS.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => navigate(menu.path)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.supportItemText}>{menu.label}</Text>
                    <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </FadeIn>

        {/* 로그아웃 / 회원탈퇴 */}
        <FadeIn delay={250}>
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
              <Icon name="log-out" size={18} color={COLORS.text.secondary} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <Text style={styles.deleteText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog {...dialog} />
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
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 40,
  },
  skeletonWrapper: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
  },

  // 프로필 카드
  profileCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    padding: 24,
    ...SHADOWS.medium,
    ...CARD_STYLE,
    borderRadius: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  profileImageWrapper: {
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary.light,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    marginBottom: 14,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.neutral.white,
    // @ts-ignore
    transition: 'all 200ms ease',
    cursor: 'pointer',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // 통계 카드
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.small,
    ...CARD_STYLE,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.neutral.grey100,
  },

  // 포인트 배너
  pointBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.small,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  pointBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBannerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  pointBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointBannerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
    letterSpacing: -0.2,
  },

  // 밥알지수 카드
  riceCard: {
    backgroundColor: COLORS.primary.light,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  riceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  riceScore: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  riceProgressBg: {
    height: 8,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  riceProgressFill: {
    height: '100%',
    borderRadius: 4,
    // @ts-ignore
    backgroundImage: `linear-gradient(90deg, ${COLORS.primary.light} 0%, ${COLORS.primary.main} 100%)`,
    backgroundColor: COLORS.primary.main,
  },
  riceGradeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // 빠른 메뉴
  quickMenuCard: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickMenuItem: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...SHADOWS.small,
    ...CARD_STYLE,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  quickMenuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMenuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 10,
  },

  // 고객지원
  supportCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  supportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // @ts-ignore
    cursor: 'pointer',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.secondary,
    letterSpacing: 0.5,
  },
  supportList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  supportItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
  },

  // 하단 액션
  bottomActions: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    width: '100%',
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
});

export default MyPageScreen;
