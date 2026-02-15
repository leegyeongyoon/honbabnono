import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { useUserStore } from '../../store/userStore';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, IconName } from '../Icon';
import userApiService from '../../services/userApiService';
import { ProfileImage } from '../ProfileImage';
import { ProfileSkeleton } from '../skeleton';

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

      } catch (error) {
        console.error('유저 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isAuthenticated]);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            logout();
            if (onLogout) {
              onLogout();
            } else {
              navigation.navigate('Login');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            // TODO: 계정 삭제 API 호출
          }
        }
      ]
    );
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
          {/* 프로필 섹션 */}
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
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.editProfileText}>프로필 수정</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 통계 카드 (3열) */}
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

          {/* 포인트 배너 */}
          <TouchableOpacity
            style={styles.pointBanner}
            onPress={() => navigation.navigate('PointCharge')}
            activeOpacity={0.7}
          >
            <View style={styles.pointBannerLeft}>
              <Icon name="credit-card" size={18} color={COLORS.primary.main} />
              <Text style={styles.pointBannerLabel}>보유 포인트</Text>
            </View>
            <View style={styles.pointBannerRight}>
              <Text style={styles.pointBannerValue}>{userStats.availablePoints.toLocaleString()}P</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
            </View>
          </TouchableOpacity>

          {/* 밥알지수 카드 */}
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

          {/* 빠른 메뉴 (2x3 그리드) */}
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

          {/* 고객지원 (접힌 목록) */}
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

          {/* 로그아웃 / 회원탈퇴 */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
              <Icon name="log-out" size={18} color={COLORS.text.secondary} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <Text style={styles.deleteText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
  },

  // 프로필 섹션
  profileSection: {
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

  // 통계 카드 (3열)
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

  // 포인트 배너
  pointBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
  },
  pointBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointBannerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pointBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointBannerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // 밥알지수 카드
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

  bottomSpacing: {
    height: 100,
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
