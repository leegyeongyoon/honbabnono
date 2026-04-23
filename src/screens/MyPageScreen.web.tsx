import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { CSS_SHADOWS } from '../styles/colors';
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
  { id: 'wishlist', label: '찜 모임', path: '/wishlist' },
  { id: 'recent-views', label: '최근 본 모임', path: '/recent-views' },
  { id: 'blocked-users', label: '차단 사용자 관리', path: '/blocked-users' },
];

const PAYMENT_MENUS: MenuRow[] = [
  { id: 'payment-methods', label: '결제 수단 관리' },
  { id: 'deposit-payment', label: '약속금 결제/환불' },
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
        hovered && { backgroundColor: '#FAFAFA' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <Text style={styles.menuRowLabel}>{label}</Text>
      <View style={styles.menuRowRight}>
        {value && <Text style={styles.menuRowValue}>{value}</Text>}
        <Icon name="chevron-right" size={16} color="#878B94" />
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
        hovered && { backgroundColor: '#FAFAFA' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...bind}
    >
      <View style={styles.statRowLeft}>
        <Icon name={icon} size={18} color="#878B94" />
        <Text style={styles.menuRowLabel}>{label}</Text>
      </View>
      <View style={styles.menuRowRight}>
        <Text style={styles.menuRowValue}>{value}</Text>
        <Icon name="chevron-right" size={16} color="#878B94" />
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>
          <TouchableOpacity
            onPress={() => navigate('/settings')}
            accessibilityLabel="설정"
            // @ts-ignore
            style={{ cursor: 'pointer' }}
          >
            <Icon name="settings" size={22} color="#121212" />
          </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => navigate('/settings')}
          activeOpacity={0.7}
          accessibilityLabel="설정"
          // @ts-ignore
          style={{ cursor: 'pointer' }}
        >
          <Icon name="settings" size={22} color="#121212" />
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
              <Icon name="edit" size={16} color="#878B94" />
            </TouchableOpacity>
          </View>
        </FadeIn>

        {/* 밥알지수 카드 */}
        <FadeIn delay={50}>
          <div style={cardStyle}>
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
                color: '#121212',
              }}>밥알지수</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#FFA529',
              }}>
                {userStats.riceIndex} 밥알 {riceGrade.emoji}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              height: 8,
              backgroundColor: '#f1f2f3',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <div style={{
                height: '100%',
                borderRadius: 4,
                backgroundColor: '#FFA529',
                width: `${Math.min(userStats.riceIndex, 100)}%`,
                transition: 'width 800ms cubic-bezier(0, 0, 0.2, 1)',
              }} />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#878B94' }}>0 밥알</span>
              <span style={{ fontSize: 12, color: '#878B94' }}>100 밥알</span>
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
              icon="users"
              label="참가한 모임"
              value={`${userStats.totalMeetups}모임`}
              onPress={() => navigate('/joined-meetups')}
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
    </View>
  );
};

// Inline style for card containers (CSS-in-JS for web-specific properties)
const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  marginLeft: 20,
  marginRight: 20,
  marginBottom: 16,
  boxShadow: CSS_SHADOWS.small,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.3,
  },
  scrollContent: {
    flex: 1,
  },
  skeletonWrapper: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },

  // 프로필 섹션
  profileSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    color: '#121212',
    letterSpacing: -0.3,
  },

  // 섹션 카드
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    // @ts-ignore
    boxShadow: CSS_SHADOWS.small,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    paddingTop: 16,
    paddingBottom: 4,
  },

  // 메뉴 행
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  menuRowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#090909',
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuRowValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#090909',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // 하단 액션
  bottomActions: {
    alignItems: 'center',
    marginTop: 16,
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
    color: '#878B94',
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
    color: '#878B94',
  },
});

export default MyPageScreen;
