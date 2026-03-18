import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Animated, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SHADOWS, CARD_STYLE, LAYOUT } from '../../styles/colors';
import { TYPOGRAPHY } from '../../styles/typography';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../../styles/spacing';
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
  iconBg: string;
  iconColor: string;
}

const QUICK_MENUS: QuickMenuItem[] = [
  { id: 'my-meetups', label: '내 약속', icon: 'calendar', screen: 'MyMeetups', iconBg: '#FFF3E0', iconColor: '#E65100' },
  { id: 'wishlist', label: '찜 목록', icon: 'heart', screen: 'Wishlist', iconBg: '#FCE4EC', iconColor: '#C62828' },
  { id: 'point-charge', label: '포인트', icon: 'credit-card', screen: 'PointCharge', iconBg: '#E8F5E9', iconColor: '#2E7D32' },
  { id: 'my-reviews', label: '리뷰', icon: 'star', screen: 'MyReviews', iconBg: '#FFF8E1', iconColor: '#F57F17' },
  { id: 'recent-views', label: '최근 본', icon: 'eye', screen: 'RecentViews', iconBg: '#E3F2FD', iconColor: '#1565C0' },
  { id: 'notification-settings', label: '설정', icon: 'settings', screen: 'Settings', iconBg: '#F3E5F5', iconColor: '#6A1B9A' },
];

// 고객지원 메뉴
const SUPPORT_MENUS = [
  { id: 'notices', label: '공지사항', screen: 'Notices', icon: 'bell' as IconName },
  { id: 'faq', label: '자주 묻는 질문', screen: 'FAQ', icon: 'info' as IconName },
  { id: 'terms', label: '이용약관', screen: 'Terms', icon: 'info' as IconName },
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
      try {
        await userApiService.deleteAccount();
        logout();
        if (onLogout) {
          onLogout();
        } else {
          navigation.navigate('Login');
        }
      } catch (_error) {
        // silently handle - user will see no change
      }
    }
  };

  const riceGrade = getRiceGrade(userStats.riceIndex);

  // 밥알지수 진행바 애니메이션
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(userStats.riceIndex, 100),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [userStats.riceIndex]);

  const RICE_MILESTONES = [0, 30, 60, 85, 100];

  // 로그인하지 않은 경우 체크 (hooks 이후에)
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="user" size={48} color={COLORS.neutral.grey300} />
        <Text style={styles.loginPromptText}>로그인이 필요합니다</Text>
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
          {/* 프로필 히어로 (딥 차콜 그라데이션) */}
          <FadeIn delay={0}>
            {Platform.OS === 'web' ? (
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.main} 100%)`,
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 28,
                paddingBottom: 28,
              }}>
                <View style={styles.profileRow}>
                  <View
                    style={styles.profileImageWrapper}
                    accessibilityLabel="프로필 사진"
                  >
                    <ProfileImage
                      profileImage={userProfileImageUrl}
                      name={user?.name || '사용자'}
                      size={72}
                    />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{user?.name || '사용자'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
                    <TouchableOpacity
                      style={styles.editProfileButton}
                      onPress={() => navigation.navigate('EditProfile')}
                      activeOpacity={0.7}
                      accessibilityLabel="프로필 수정"
                      accessibilityRole="button"
                    >
                      <Text style={styles.editProfileText}>프로필 수정</Text>
                      <Icon name="chevron-right" size={12} color={COLORS.neutral.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </div>
            ) : (
              <LinearGradient
                colors={COLORS.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileHero}
              >
                {/* Decorative circles */}
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />

                <View style={styles.profileRow}>
                  <View
                    style={styles.profileImageWrapper}
                    accessibilityLabel="프로필 사진"
                  >
                    <ProfileImage
                      profileImage={userProfileImageUrl}
                      name={user?.name || '사용자'}
                      size={72}
                    />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{user?.name || '사용자'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
                    <TouchableOpacity
                      style={styles.editProfileButton}
                      onPress={() => navigation.navigate('EditProfile')}
                      activeOpacity={0.7}
                      accessibilityLabel="프로필 수정"
                      accessibilityRole="button"
                    >
                      <Text style={styles.editProfileText}>프로필 수정</Text>
                      <Icon name="chevron-right" size={12} color={COLORS.neutral.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            )}
          </FadeIn>

          {/* 통계 카드 (클린 화이트, 서틀 보더) */}
          <FadeIn delay={50}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{userStats.totalMeetups}</Text>
                <Text style={styles.statLabel}>참여</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{userStats.hostedMeetups}</Text>
                <Text style={styles.statLabel}>주최</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
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
                <Icon name="credit-card" size={18} color={COLORS.primary.accent} />
                <Text style={styles.pointBannerLabel}>보유 포인트</Text>
              </View>
              <View style={styles.pointBannerRight}>
                <Text style={styles.pointBannerValue}>{userStats.availablePoints.toLocaleString()}P</Text>
                <View style={styles.chargeButton}>
                  <Text style={styles.chargeButtonText}>충전</Text>
                </View>
              </View>
            </TouchableOpacity>
          </FadeIn>

          {/* 밥알지수 카드 */}
          <FadeIn delay={100}>
            <LinearGradient
              colors={['#FFF8F0', '#FFFFFF']}
              style={styles.riceCard}
            >
              <View style={styles.riceHeader}>
                <View style={styles.riceHeaderLeft}>
                  <View style={styles.riceIconCircle}>
                    <Text style={styles.riceIconEmoji}>🍚</Text>
                  </View>
                  <Text style={styles.riceLabel}>밥알지수</Text>
                </View>
                <Text style={styles.riceScore}>{userStats.riceIndex}점</Text>
              </View>
              <View style={styles.riceProgressBg}>
                <Animated.View
                  style={[
                    styles.riceProgressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              {/* 마일스톤 마커 */}
              <View style={styles.milestoneRow}>
                {RICE_MILESTONES.map((milestone) => (
                  <Text
                    key={milestone}
                    style={[
                      styles.milestoneText,
                      userStats.riceIndex >= milestone && styles.milestoneTextActive,
                    ]}
                  >
                    {milestone}
                  </Text>
                ))}
              </View>
              <Text style={styles.riceGradeText}>
                {riceGrade.emoji} {riceGrade.label}
              </Text>
            </LinearGradient>
          </FadeIn>

          {/* 빠른 메뉴 (3x2 그리드) */}
          <FadeIn delay={150}>
            <View style={styles.quickMenuSection}>
              <View style={styles.quickMenuGrid}>
                {QUICK_MENUS.map((menu) => (
                  <TouchableOpacity
                    key={menu.id}
                    style={styles.quickMenuItem}
                    onPress={() => navigation.navigate(menu.screen)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickMenuIconBox, { backgroundColor: menu.iconBg }]}>
                      <Icon name={menu.icon} size={20} color={menu.iconColor} />
                    </View>
                    <Text style={styles.quickMenuLabel} numberOfLines={1}>{menu.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FadeIn>

          {/* 구분선 */}
          <View style={styles.sectionDivider} />

          {/* 고객지원 */}
          <FadeIn delay={200}>
            <View style={styles.supportSection}>
              <Text style={styles.supportTitle}>고객지원</Text>
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
                    <View style={styles.supportItemLeft}>
                      <View style={styles.supportIconCircle}>
                        <Icon name={menu.icon} size={16} color={COLORS.text.secondary} />
                      </View>
                      <Text style={styles.supportItemText}>{menu.label}</Text>
                    </View>
                    <Icon name="chevron-right" size={14} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FadeIn>

          {/* 로그아웃 / 회원탈퇴 */}
          <FadeIn delay={250}>
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="로그아웃"
                accessibilityRole="button"
              >
                <Icon name="log-out" size={16} color={COLORS.text.tertiary} />
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
                accessibilityLabel="회원탈퇴"
                accessibilityRole="button"
              >
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
    backgroundColor: COLORS.surface.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loginPromptText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  headerTitle: {
    ...HEADER_STYLE.title,
  },
  content: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
  },

  // 프로필 히어로 (딥 차콜)
  profileHero: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingTop: 28,
    paddingBottom: 44,
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileImageWrapper: {
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.white,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.white,
  },

  // 통계 카드 (화이트 카드, 오버랩)
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginTop: -20,
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: 16,
    gap: 0,
    ...SHADOWS.medium,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.neutral.grey100,
    alignSelf: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // 포인트 배너
  pointBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: SPACING.xl,
    marginTop: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pointBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBannerLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    color: COLORS.primary.accent,
    letterSpacing: -0.2,
  },
  chargeButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chargeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  // 밥알지수 카드
  riceCard: {
    marginHorizontal: SPACING.xl,
    marginTop: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    padding: 16,
  },
  riceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riceIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riceIconEmoji: {
    fontSize: 14,
  },
  riceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  riceScore: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.accent,
  },
  riceProgressBg: {
    height: 6,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  riceProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary.accent,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
    marginBottom: 10,
  },
  milestoneText: {
    fontSize: 9,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
  milestoneTextActive: {
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  riceGradeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },

  // 빠른 메뉴
  quickMenuSection: {
    paddingHorizontal: SPACING.xl,
    marginTop: 20,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickMenuItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  quickMenuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickMenuLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 8,
  },

  // 구분선
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey100,
    marginHorizontal: SPACING.xl,
    marginTop: 20,
  },

  // 고객지원
  supportSection: {
    marginTop: 16,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.xl,
    marginBottom: 8,
  },
  supportList: {
    marginHorizontal: SPACING.xl,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  supportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.primary,
  },

  // 하단 액션
  bottomActions: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    width: '100%',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },

  bottomSpacing: {
    height: 40,
  },
  loginButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
  },
  loginButtonText: {
    color: COLORS.neutral.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default UniversalMyPageScreen;
