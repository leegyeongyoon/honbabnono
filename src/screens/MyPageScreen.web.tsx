import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, CSS_SHADOWS, TRANSITIONS, CARD_STYLE } from '../styles/colors';
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

// 메뉴 아이템 (활동 관리 / 결제 관리)
interface MenuRow {
  id: string;
  label: string;
  path?: string;
}

const ACTIVITY_MENUS: MenuRow[] = [
  { id: 'my-reservations', label: '내 예약 내역', path: '/my-reservations' },
  { id: 'wishlist', label: '찜한 매장', path: '/wishlist' },
  { id: 'recent-views', label: '최근 본 매장', path: '/recent-views' },
  { id: 'blocked-users', label: '차단 사용자 관리', path: '/blocked-users' },
];

const PAYMENT_MENUS: MenuRow[] = [
  { id: 'point-charge', label: '포인트 충전/사용', path: '/point-charge' },
];

// 호버 가능한 메뉴 행
const HoverMenuRow: React.FC<{
  label: string;
  value?: string;
  isLast?: boolean;
  onPress: () => void;
}> = ({ label, value, isLast, onPress }) => {
  const { hovered, bind } = useHover();
  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        hovered && { backgroundColor: COLORS.neutral.grey50 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <Text style={styles.menuRowLabel}>{label}</Text>
      <View style={styles.menuRowRight}>
        {value && <Text style={styles.menuRowValue}>{value}</Text>}
        <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

// 스탯 행 (보유 포인트, 참가한 모임, 후기 관리)
const HoverStatRow: React.FC<{
  icon: IconName;
  label: string;
  value: string;
  isLast?: boolean;
  onPress: () => void;
}> = ({ icon, label, value, isLast, onPress }) => {
  const { hovered, bind } = useHover();
  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        hovered && { backgroundColor: COLORS.neutral.grey50 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <View style={styles.statRowLeft}>
        <Icon name={icon} size={18} color={COLORS.text.tertiary} />
        <Text style={styles.menuRowLabel}>{label}</Text>
      </View>
      <View style={styles.menuRowRight}>
        <Text style={styles.menuRowValue}>{value}</Text>
        <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
      </View>
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
      <div style={pageStyles.wrapper}>
        <div style={pageStyles.innerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>마이페이지</Text>
            <TouchableOpacity
              onPress={() => navigate('/settings')}
              accessibilityLabel="설정"
              // @ts-ignore
              style={{ cursor: 'pointer' }}
            >
              <Icon name="settings" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.skeletonWrapper}>
            <ProfileSkeleton />
          </View>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.innerContainer}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <TouchableOpacity
          onPress={() => navigate('/settings')}
          activeOpacity={0.7}
          accessibilityLabel="설정"
          // @ts-ignore
          style={{ cursor: 'pointer' }}
        >
          <Icon name="settings" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 프로필 섹션 (centered) */}
        <FadeIn delay={0}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <ProfileImage
                profileImage={userProfileImageUrl}
                name={user?.name || '사용자'}
                size={100}
              />
            </View>
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => navigate('/mypage/edit')}
              activeOpacity={0.7}
              accessibilityLabel="프로필 수정"
            >
              <Text style={styles.userName}>{user?.name || '사용자'}</Text>
              <Icon name="edit" size={16} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* 밥알지수 카드 */}
        <FadeIn delay={50}>
          <div style={riceCardStyle}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.text.primary,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>밥알지수</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.primary.main,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {userStats.riceIndex} 밥알 {riceGrade.emoji}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              height: 8,
              backgroundColor: COLORS.neutral.light,
              borderRadius: BORDER_RADIUS.sm,
              overflow: 'hidden',
              marginBottom: SPACING.sm,
            }}>
              <div style={{
                height: '100%',
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: COLORS.primary.main,
                width: `${Math.min(userStats.riceIndex, 100)}%`,
                transition: `width 800ms cubic-bezier(0, 0, 0.2, 1)`,
              }} />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: COLORS.text.tertiary, fontFamily: 'system-ui, -apple-system, sans-serif' }}>0 밥알</span>
              <span style={{ fontSize: 12, color: COLORS.text.tertiary, fontFamily: 'system-ui, -apple-system, sans-serif' }}>100 밥알</span>
            </div>
          </div>
        </FadeIn>

        {/* 스탯 섹션 (보유 포인트, 참가한 모임, 후기 관리) */}
        <FadeIn delay={100}>
          <View style={styles.sectionCard}>
            <HoverStatRow
              icon="credit-card"
              label="보유한 포인트"
              value={`${userStats.availablePoints.toLocaleString()}원`}
              onPress={() => navigate('/point-history')}
            />
            <HoverStatRow
              icon="calendar"
              label="이용한 예약"
              value={`${userStats.totalMeetups}회`}
              onPress={() => navigate('/my-reservations')}
            />
            <HoverStatRow
              icon="star"
              label="후기 관리"
              value={`${userStats.reviewCount}회`}
              isLast
              onPress={() => navigate('/my-reviews')}
            />
          </View>
        </FadeIn>

        {/* 활동 관리 섹션 */}
        <FadeIn delay={150}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>활동 관리</Text>
            {ACTIVITY_MENUS.map((menu, idx) => (
              <HoverMenuRow
                key={menu.id}
                label={menu.label}
                isLast={idx === ACTIVITY_MENUS.length - 1}
                onPress={() => menu.path && navigate(menu.path)}
              />
            ))}
          </View>
        </FadeIn>

        {/* 결제 관리 섹션 */}
        <FadeIn delay={200}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>결제 관리</Text>
            {PAYMENT_MENUS.map((menu, idx) => (
              <HoverMenuRow
                key={menu.id}
                label={menu.label}
                isLast={idx === PAYMENT_MENUS.length - 1}
                onPress={() => menu.path && navigate(menu.path)}
              />
            ))}
          </View>
        </FadeIn>

        {/* 로그아웃 / 회원탈퇴 */}
        <FadeIn delay={250}>
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                logoutHover.hovered && { opacity: 0.7 },
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
      </div>
    </div>
  );
};

// Web wrapper styles for maxWidth: 480 centered container
const pageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  innerContainer: {
    maxWidth: 480,
    margin: '0 auto',
    backgroundColor: COLORS.neutral.background,
    minHeight: '100vh',
  },
};

// Inline style for rice-index card (CSS-in-JS for web-specific properties)
const riceCardStyle: React.CSSProperties = {
  backgroundColor: COLORS.surface.primary,
  borderRadius: BORDER_RADIUS.xxl,
  padding: SPACING.screen.horizontal,
  marginLeft: SPACING.screen.horizontal,
  marginRight: SPACING.screen.horizontal,
  marginBottom: SPACING.lg,
  boxShadow: CSS_SHADOWS.card,
  border: `1px solid ${CARD_STYLE.borderColor}`,
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
    paddingHorizontal: HEADER_STYLE.main.paddingHorizontal,
    paddingTop: HEADER_STYLE.main.paddingTop,
    paddingBottom: HEADER_STYLE.main.paddingBottom,
    backgroundColor: HEADER_STYLE.main.backgroundColor,
    borderBottomWidth: HEADER_STYLE.main.borderBottomWidth,
    borderBottomColor: HEADER_STYLE.main.borderBottomColor,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: HEADER_STYLE.title.fontSize,
    fontWeight: HEADER_STYLE.title.fontWeight,
    color: HEADER_STYLE.title.color,
    letterSpacing: HEADER_STYLE.title.letterSpacing,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  scrollContent: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: SPACING.xl,
    backgroundColor: COLORS.neutral.background,
  },

  // 프로필 섹션
  profileSection: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.section.paddingBottom,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // @ts-ignore
    cursor: 'pointer',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  // 섹션 카드
  sectionCard: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.xxl,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.screen.horizontal,
    marginHorizontal: SPACING.screen.horizontal,
    marginBottom: SPACING.lg,
    // @ts-ignore
    boxShadow: CSS_SHADOWS.card,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  // 메뉴 행
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    // @ts-ignore
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  menuRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  menuRowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.secondary,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  // 하단 액션
  bottomActions: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.screen.horizontal,
    paddingBottom: SPACING.screen.horizontal,
  },
  logoutButton: {
    paddingVertical: SPACING.md,
    // @ts-ignore
    cursor: 'pointer',
    transition: `opacity ${TRANSITIONS.fast}`,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  deleteButton: {
    marginTop: SPACING.sm,
    paddingVertical: 6,
    // @ts-ignore
    cursor: 'pointer',
    transition: `opacity ${TRANSITIONS.fast}`,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    // @ts-ignore
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
});

export default MyPageScreen;
