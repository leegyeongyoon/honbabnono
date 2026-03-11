import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles/spacing';
import { useUserStore } from '../store/userStore';
import { Icon, IconName } from '../components/Icon';
import userApiService from '../services/userApiService';
import { ProfileImage } from '../components/ProfileImage';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ProfileSkeleton } from '../components/skeleton';
import { FadeIn } from '../components/animated';

// 웹 호버 상태 관리 훅
const useHover = () => {
  const [hovered, setHovered] = useState(false);
  const bind = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
  return { hovered, bind };
};

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
  { id: 'my-meetups', label: '내 약속', icon: 'calendar', path: '/my-meetups' },
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

// 호버 가능한 퀵메뉴 아이템
const HoverQuickMenuItem: React.FC<{ menu: QuickMenuItem; onPress: () => void }> = ({ menu, onPress }) => {
  const { hovered, bind } = useHover();
  return (
    <TouchableOpacity
      key={menu.id}
      style={[
        styles.quickMenuItem,
        hovered && {
          // @ts-ignore
          borderColor: COLORS.neutral.grey200,
          backgroundColor: COLORS.neutral.grey50,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <View style={styles.quickMenuIconBox}>
        <Icon name={menu.icon} size={20} color={COLORS.primary.accent} />
      </View>
      <Text style={styles.quickMenuLabel} numberOfLines={1}>{menu.label}</Text>
    </TouchableOpacity>
  );
};

// 호버 가능한 설정(고객지원) 메뉴 아이템
const HoverSupportItem: React.FC<{
  menu: { id: string; label: string; path: string };
  isLast: boolean;
  onPress: () => void;
}> = ({ menu, isLast, onPress }) => {
  const { hovered, bind } = useHover();
  return (
    <TouchableOpacity
      style={[
        styles.supportItem,
        isLast && { borderBottomWidth: 0 },
        hovered && { backgroundColor: COLORS.neutral.grey50 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <Text style={styles.supportItemText}>{menu.label}</Text>
      <Icon name="chevron-right" size={14} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );
};

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

  // 호버 상태
  const editProfileHover = useHover();
  const pointBannerHover = useHover();
  const logoutHover = useHover();
  const deleteHover = useHover();

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
        {/* 프로필 히어로 (브랜드 그라디언트) */}
        <FadeIn delay={0}>
          <div style={{
            background: COLORS.gradient.heroCSS,
            paddingLeft: 20,
            paddingRight: 20,
            paddingTop: 28,
            paddingBottom: 28,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 장식 원형 */}
            <div style={{
              position: 'absolute',
              top: -30,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: 60,
              background: 'rgba(255,255,255,0.06)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: -40,
              left: -10,
              width: 90,
              height: 90,
              borderRadius: 45,
              background: 'rgba(255,255,255,0.04)',
            }} />
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
                  style={[
                    styles.editProfileButton,
                    editProfileHover.hovered && {
                      // @ts-ignore
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    },
                  ]}
                  onPress={() => navigate('/mypage/edit')}
                  activeOpacity={0.7}
                  accessibilityLabel="프로필 수정"
                  {...editProfileHover.bind}
                >
                  <Text style={styles.editProfileText}>프로필 수정</Text>
                  <Icon name="chevron-right" size={12} color={COLORS.neutral.white} />
                </TouchableOpacity>
              </View>
            </View>
          </div>
        </FadeIn>

        {/* 통계 카드 (클린 화이트) */}
        <FadeIn delay={50}>
          <View style={styles.statsRow}>
            {[
              { value: userStats.totalMeetups, label: '참여' },
              { value: userStats.hostedMeetups, label: '주최' },
              { value: userStats.reviewCount, label: '리뷰' },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  backgroundColor: COLORS.surface.primary,
                  paddingTop: 16,
                  paddingBottom: 16,
                  borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${COLORS.neutral.grey100}`,
                  transition: 'border-color 150ms ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = COLORS.neutral.grey200;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = COLORS.neutral.grey100;
                }}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </div>
            ))}
          </View>
        </FadeIn>

        {/* 포인트 배너 */}
        <FadeIn delay={75}>
          <TouchableOpacity
            style={[
              styles.pointBanner,
              pointBannerHover.hovered && {
                // @ts-ignore
                borderColor: COLORS.neutral.grey200,
              },
            ]}
            onPress={() => navigate('/point-charge')}
            activeOpacity={0.7}
            {...pointBannerHover.bind}
          >
            <View style={styles.pointBannerLeft}>
              <Icon name="credit-card" size={18} color={COLORS.primary.accent} />
              <Text style={styles.pointBannerLabel}>보유 포인트</Text>
            </View>
            <View style={styles.pointBannerRight}>
              <Text style={styles.pointBannerValue}>{userStats.availablePoints.toLocaleString()}P</Text>
              <Icon name="chevron-right" size={14} color={COLORS.text.tertiary} />
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
            <div style={{ position: 'relative' }}>
              <View style={styles.riceProgressBg}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: COLORS.primary.accent,
                    width: `${Math.min(userStats.riceIndex, 100)}%`,
                    transition: 'width 800ms cubic-bezier(0, 0, 0.2, 1)',
                  }}
                />
              </View>
              {/* 마일스톤 마커 */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingLeft: 2,
                paddingRight: 2,
                marginTop: 4,
              }}>
                {[0, 30, 60, 85, 100].map((milestone) => (
                  <span key={milestone} style={{
                    fontSize: 9,
                    color: userStats.riceIndex >= milestone ? COLORS.text.secondary : COLORS.text.tertiary,
                    fontWeight: userStats.riceIndex >= milestone ? 500 : 400,
                  }}>{milestone}</span>
                ))}
              </div>
            </div>
            <Text style={styles.riceGradeText}>
              {riceGrade.emoji} {riceGrade.label}
            </Text>
          </View>
        </FadeIn>

        {/* 빠른 메뉴 (3x2 그리드) */}
        <FadeIn delay={150}>
          <View style={styles.quickMenuSection}>
            <View style={styles.quickMenuGrid}>
              {QUICK_MENUS.map((menu) => (
                <HoverQuickMenuItem
                  key={menu.id}
                  menu={menu}
                  onPress={() => navigate(menu.path)}
                />
              ))}
            </View>
          </View>
        </FadeIn>

        {/* 구분선 */}
        <View style={styles.sectionDivider} />

        {/* 고객지원 (접힌 목록) */}
        <FadeIn delay={200}>
          <View style={styles.supportSection}>
            <TouchableOpacity
              style={styles.supportHeader}
              onPress={() => setSupportExpanded(!supportExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.supportTitle}>고객지원</Text>
              <Icon
                name={supportExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.text.tertiary}
              />
            </TouchableOpacity>
            {supportExpanded && (
              <View style={styles.supportList}>
                {SUPPORT_MENUS.map((menu, idx) => (
                  <HoverSupportItem
                    key={menu.id}
                    menu={menu}
                    isLast={idx === SUPPORT_MENUS.length - 1}
                    onPress={() => navigate(menu.path)}
                  />
                ))}
              </View>
            )}
          </View>
        </FadeIn>

        {/* 로그아웃 / 회원탈퇴 */}
        <FadeIn delay={250}>
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                logoutHover.hovered && {
                  // @ts-ignore
                  borderColor: COLORS.neutral.grey300,
                  backgroundColor: COLORS.neutral.grey50,
                },
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel="로그아웃"
              {...logoutHover.bind}
            >
              <Icon name="log-out" size={16} color={COLORS.text.tertiary} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                deleteHover.hovered && { opacity: 0.6 },
              ]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              accessibilityLabel="회원탈퇴"
              {...deleteHover.bind}
            >
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
    ...HEADER_STYLE.main,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: CSS_SHADOWS.stickyHeader,
  },
  headerTitle: {
    ...HEADER_STYLE.title,
  },
  scrollContent: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
  },

  // 프로필 히어로
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
    // @ts-ignore
    transition: 'background-color 150ms ease',
    cursor: 'pointer',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.white,
  },

  // 통계 카드
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    paddingTop: 16,
    gap: 10,
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
    // @ts-ignore
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
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

  // 밥알지수 카드
  riceCard: {
    backgroundColor: COLORS.surface.primary,
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
    marginBottom: 10,
  },
  riceProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary.accent,
  },
  riceGradeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 4,
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
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  quickMenuIconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginHorizontal: SPACING.xl,
    marginTop: 16,
  },
  supportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    // @ts-ignore
    cursor: 'pointer',
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  supportList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
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
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 150ms ease',
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
    // @ts-ignore
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },
});

export default MyPageScreen;
