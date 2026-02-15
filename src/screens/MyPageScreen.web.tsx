import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
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
        <View style={{ padding: 20, backgroundColor: COLORS.neutral.white }}>
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
        {/* 프로필 헤더 */}
        <FadeIn delay={0}>
          <View style={styles.profileSection}>
            <View style={styles.profileRow}>
              <ProfileImage
                profileImage={userProfileImageUrl}
                name={user?.name || '사용자'}
                size={96}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name || '사용자'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => navigate('/mypage/edit')}
                >
                  <Text style={styles.editProfileText}>프로필 수정</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* 통계 카드 (3열) */}
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
              {riceGrade.emoji} 등급: {riceGrade.label}
            </Text>
          </View>
        </FadeIn>

        {/* 빠른 메뉴 (2x3 그리드) */}
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
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="log-out" size={18} color={COLORS.text.secondary} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        <View style={{ height: 100 }} />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scrollContent: {
    flex: 1,
  },

  // 프로필
  profileSection: {
    // @ts-ignore
    backgroundImage: `linear-gradient(180deg, ${COLORS.primary.accent} 0%, ${COLORS.neutral.background} 100%)`,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  editProfileButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // 통계 카드
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.neutral.grey200,
  },

  // 밥알지수
  riceCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.medium,
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
    height: 10,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  riceProgressFill: {
    height: '100%',
    borderRadius: 5,
    // @ts-ignore
    backgroundImage: `linear-gradient(90deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
    backgroundColor: COLORS.primary.main,
  },
  riceGradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // 빠른 메뉴
  quickMenuCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.medium,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickMenuItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 14,
  },
  quickMenuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickMenuLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },

  // 고객지원
  supportCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  supportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  supportList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  supportItemText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },

  // 하단 액션
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 24,
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteText: {
    fontSize: 14,
    color: COLORS.functional.error,
    fontWeight: '500',
  },
});

export default MyPageScreen;
