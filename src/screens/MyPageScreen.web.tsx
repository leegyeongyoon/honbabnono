import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, CSS_SHADOWS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
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
  iconBg: string;
  iconColor: string;
}

const QUICK_MENUS: QuickMenuItem[] = [
  { id: 'my-meetups', label: '내 약속', icon: 'calendar', path: '/my-meetups', iconBg: '#FFF3E0', iconColor: '#E65100' },
  { id: 'wishlist', label: '찜 목록', icon: 'heart', path: '/wishlist', iconBg: '#FCE4EC', iconColor: '#C62828' },
  { id: 'point-charge', label: '포인트', icon: 'credit-card', path: '/point-charge', iconBg: '#E8F5E9', iconColor: '#2E7D32' },
  { id: 'my-reviews', label: '리뷰', icon: 'star', path: '/my-reviews', iconBg: '#FFF8E1', iconColor: '#F57F17' },
  { id: 'recent-views', label: '최근 본', icon: 'eye', path: '/recent-views', iconBg: '#E3F2FD', iconColor: '#1565C0' },
  { id: 'notification-settings', label: '설정', icon: 'settings', path: '/notification-settings', iconBg: '#F3E5F5', iconColor: '#6A1B9A' },
];

// 고객지원 메뉴
interface SupportMenuItem {
  id: string;
  label: string;
  path: string;
  icon: IconName;
}

const SUPPORT_MENUS: SupportMenuItem[] = [
  { id: 'notices', label: '공지사항', path: '/notices', icon: 'bell' },
  { id: 'faq', label: 'FAQ', path: '/faq', icon: 'info' },
  { id: 'inquiry', label: '문의하기', path: '/inquiry', icon: 'message-circle' },
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
          backgroundColor: COLORS.neutral.grey50,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <View style={[styles.quickMenuIconBox, { backgroundColor: menu.iconBg }]}>
        <Icon name={menu.icon} size={20} color={menu.iconColor} />
      </View>
      <Text style={styles.quickMenuLabel} numberOfLines={1}>{menu.label}</Text>
    </TouchableOpacity>
  );
};

// 호버 가능한 고객지원 메뉴 아이템
const HoverSupportItem: React.FC<{
  menu: SupportMenuItem;
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
      <View style={styles.supportItemLeft}>
        <View style={styles.supportIconCircle}>
          <Icon name={menu.icon} size={16} color={COLORS.text.secondary} />
        </View>
        <Text style={styles.supportItemText}>{menu.label}</Text>
      </View>
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
      try {
        await userApiService.deleteAccount();
        logout();
        navigate('/login');
      } catch (_error) {
        // silently handle
      }
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
            paddingBottom: 40,
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
                  size={64}
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

        {/* 통계 카드 (3-column, 히어로와 겹침) */}
        <FadeIn delay={50}>
          <div style={{
            marginLeft: 20,
            marginRight: 20,
            marginTop: -20,
            backgroundColor: COLORS.surface.primary,
            borderRadius: 12,
            boxShadow: CSS_SHADOWS.medium,
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            zIndex: 2,
          }}>
            {[
              { value: userStats.totalMeetups, label: '참여' },
              { value: userStats.hostedMeetups, label: '주최' },
              { value: userStats.reviewCount, label: '리뷰' },
            ].map((stat, idx) => (
              <React.Fragment key={stat.label}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  paddingTop: 18,
                  paddingBottom: 18,
                }}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </div>
                {idx < 2 && (
                  <div style={{
                    width: 1,
                    height: 32,
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    alignSelf: 'center',
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </FadeIn>

        {/* 포인트 카드 */}
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
              <View style={styles.pointIconCircle}>
                <Icon name="credit-card" size={16} color={COLORS.primary.accent} />
              </View>
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
          <div style={{
            marginLeft: 20,
            marginRight: 20,
            marginTop: 12,
            borderRadius: 8,
            background: COLORS.gradient.subtleGold,
            overflow: 'hidden',
          }}>
            <View style={styles.riceCard}>
              <View style={styles.riceHeader}>
                <View style={styles.riceHeaderLeft}>
                  <View style={styles.riceIconCircle}>
                    <Text style={{ fontSize: 14 }}>🍚</Text>
                  </View>
                  <Text style={styles.riceLabel}>밥알지수</Text>
                </View>
                <Text style={styles.riceScore}>{userStats.riceIndex}점</Text>
              </View>
              <div style={{ position: 'relative' }}>
                <View style={styles.riceProgressBg}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 4,
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
              <View style={styles.riceGradeRow}>
                <Text style={styles.riceGradeEmoji}>{riceGrade.emoji}</Text>
                <Text style={styles.riceGradeLabel}>{riceGrade.label}</Text>
              </View>
            </View>
          </div>
        </FadeIn>

        {/* 빠른 메뉴 (3x2 그리드) */}
        <FadeIn delay={150}>
          <View style={styles.quickMenuSection}>
            <Text style={styles.sectionTitle}>바로가기</Text>
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

        {/* 고객지원 */}
        <FadeIn delay={200}>
          <View style={styles.supportSection}>
            <Text style={styles.sectionTitle}>고객지원</Text>
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
                  opacity: 0.7,
                },
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityLabel="로그아웃"
              {...logoutHover.bind}
            >
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: CSS_SHADOWS.stickyHeader,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  scrollContent: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
  },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  // 프로필 히어로
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileImageWrapper: {
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
    overflow: 'hidden',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.white,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginTop: 4,
  },

  // 포인트 카드
  pointBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: 20,
    marginTop: 16,
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
  pointIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointBannerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pointBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointBannerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.accent,
    letterSpacing: -0.2,
  },
  chargeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary.light,
  },
  chargeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // 밥알지수 카드
  riceCard: {
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
    backgroundColor: 'rgba(212,136,44,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  riceProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.primary.accent,
  },
  riceGradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  riceGradeEmoji: {
    fontSize: 18,
  },
  riceGradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // 빠른 메뉴
  quickMenuSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickMenuItem: {
    width: '30.5%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.md,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  quickMenuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
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

  // 고객지원
  supportSection: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  supportList: {},
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  supportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    marginTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    paddingVertical: 10,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 6,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
});

export default MyPageScreen;
