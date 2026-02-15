import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import { useUserStore } from '../../store/userStore';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, IconName } from '../Icon';
import userApiService from '../../services/userApiService';
import { ProfileImage } from '../ProfileImage';
import { ProfileSkeleton } from '../skeleton';
import { FadeIn } from '../animated';
import ConfirmDialog from '../ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

interface User {
  id: string;
  name: string;
  email: string;
}

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalMyPageScreenProps {
  navigation: NavigationAdapter;
  user?: User | null;
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
  screen: string;
}

const QUICK_MENUS: QuickMenuItem[] = [
  { id: 'my-meetups', label: '내 모임', icon: 'calendar', screen: 'MyMeetups' },
  { id: 'wishlist', label: '찜 목록', icon: 'heart', screen: 'Wishlist' },
  { id: 'point-charge', label: '포인트', icon: 'credit-card', screen: 'PointCharge' },
  { id: 'my-reviews', label: '리뷰', icon: 'star', screen: 'MyReviews' },
  { id: 'recent-views', label: '최근 본', icon: 'eye', screen: 'RecentViews' },
  { id: 'notification-settings', label: '설정', icon: 'settings', screen: 'Settings' },
];

// 고객지원 메뉴
const SUPPORT_MENUS = [
  { id: 'notices', label: '공지사항', screen: 'Notices' },
  { id: 'faq', label: '자주 묻는 질문', screen: 'FAQ' },
  { id: 'terms', label: '이용약관', screen: 'Terms' },
];

const UniversalMyPageScreen: React.FC<UniversalMyPageScreenProps> = ({
  navigation,
  user: propsUser,
  onLogout
}) => {
  const { user: storeUser, logout } = useUserStore();
  const { isAuthenticated } = useAuth();

  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  const [userStats, setUserStats] = useState({
    riceIndex: 0,
    availablePoints: 0,
    totalMeetups: 0,
    hostedMeetups: 0,
    reviewCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [userProfileImageUrl, setUserProfileImageUrl] = useState(null);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const { dialog, confirmDanger, confirm } = useConfirmDialog();

  // API에서 유저 데이터 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      // 인증되지 않았거나 유저가 없으면 API 호출하지 않음
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 사용자 통계 가져오기
        const stats = await userApiService.getUserStats();

        // 밥알지수 가져오기
        const riceIndexResponse = await userApiService.getRiceIndex();

        // 통계에 밥알지수 추가
        const updatedStats = {
          ...stats,
          riceIndex: riceIndexResponse?.riceIndex || 0
        };
        setUserStats(updatedStats);

        // 프로필 정보 가져오기
        const userData = await userApiService.getProfile();
        setUserProfileImageUrl(userData.profileImage);

      } catch (_error) {
        // silently handle
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isAuthenticated]);

  const handleLogout = async () => {
    const confirmed = await confirm('로그아웃', '로그아웃 하시겠습니까?');
    if (confirmed) {
      logout();
      if (onLogout) {
        onLogout();
      } else {
        navigation.navigate('Login');
      }
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirmDanger('회원 탈퇴', '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (confirmed) {
      // TODO: 계정 삭제 API 호출
    }
  };

  const riceGrade = getRiceGrade(userStats.riceIndex);

  // 로그인하지 않은 경우 체크 (hooks 이후에)
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>로그인이 필요합니다</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>마이페이지</Text>
          </View>
          <View style={styles.skeletonWrapper}>
            <ProfileSkeleton />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                    onPress={() => navigation.navigate('EditProfile')}
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
              onPress={() => navigation.navigate('PointCharge')}
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
                    onPress={() => navigation.navigate(menu.screen)}
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
                      onPress={() => navigation.navigate(menu.screen)}
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

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      <ConfirmDialog {...dialog} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
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
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  content: {
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
    borderRadius: 20,
    padding: 24,
    ...SHADOWS.medium,
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.small,
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
  },
  pointBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBannerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pointBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointBannerValue: {
    fontSize: 20,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  riceScore: {
    fontSize: 15,
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
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...SHADOWS.small,
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
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },

  bottomSpacing: {
    height: 40,
  },
  loginButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UniversalMyPageScreen;
