import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { useUserStore } from '../../store/userStore';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';
import { ProfileImage } from '../ProfileImage';

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

// 메뉴 카드 컴포넌트
const MenuCard: React.FC<{
  title: string;
  iconName: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }>;
}> = ({ title, iconName, items }) => (
  <View style={styles.menuCard}>
    <View style={styles.menuCardHeader}>
      <View style={styles.menuCardIcon}>
        <Icon name={iconName} size={20} color={COLORS.primary.main} />
      </View>
      <Text style={styles.menuCardTitle}>{title}</Text>
    </View>
    <View style={styles.menuCardContent}>
      {items.map((item, index) => (
        <TouchableOpacity 
          key={item.id}
          style={[
            styles.menuItem,
            index === items.length - 1 && styles.lastMenuItem
          ]}
          onPress={item.onPress}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuItemText}>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              )}
            </View>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

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
        console.log('🍚 밥알지수 API 응답:', riceIndexResponse);
        
        // 통계에 밥알지수 추가
        const updatedStats = {
          ...stats,
          riceIndex: riceIndexResponse?.riceIndex || 0
        };
        setUserStats(updatedStats);
        console.log('🍚 최종 userStats:', updatedStats);
        
        // 프로필 정보 가져오기
        const userData = await userApiService.getProfile();
        console.log('🔍 받아온 프로필 데이터:', userData);
        console.log('🖼️ 프로필 이미지 URL:', userData.profileImage);
        setUserProfileImageUrl(userData.profileImage);
        
      } catch (error) {
        console.error('유저 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, isAuthenticated]);

  // 메뉴 핸들러들
  const handleMenuPress = (menuId: string) => {
    console.log('메뉴 선택:', menuId);
    
    switch (menuId) {
      // 기본 정보
      case 'badge-info':
        navigation.navigate('MyBadges');
        break;
      case 'point-balance':
        navigation.navigate('PointHistory');
        break;
      case 'my-meetups':
        navigation.navigate('MyMeetups');
        break;
      case 'review-management':
        navigation.navigate('MyReviews');
        break;
        
      // 활동 관리
      case 'wishlist':
        navigation.navigate('Wishlist');
        break;
      case 'recent-views':
        navigation.navigate('RecentViews');
        break;
      case 'blocked-users':
        navigation.navigate('BlockedUsers');
        break;
      case 'my-reviews':
        navigation.navigate('MyReviews');
        break;
        
      // 결제 관리
      case 'payment-history':
        navigation.navigate('PaymentHistory');
        break;
      case 'point-charge':
        navigation.navigate('PointCharge');
        break;
        
      // 친구 초대
      case 'invite-friends':
        navigation.navigate('InviteFriends');
        break;
        
      // 고객 지원
      case 'notices':
        navigation.navigate('Notices');
        break;
      case 'faq':
        navigation.navigate('FAQ');
        break;
      case 'customer-support':
        navigation.navigate('CustomerSupport');
        break;
      case 'terms':
        navigation.navigate('Terms');
        break;
      case 'app-info':
        navigation.navigate('AppInfo');
        break;
        
      // 설정
      case 'notification-settings':
        navigation.navigate('NotificationSettings');
        break;
      case 'privacy-settings':
        navigation.navigate('PrivacySettings');
        break;
      case 'logout':
        handleLogout();
        break;
      case 'delete-account':
        handleDeleteAccount();
        break;
        
      default:
        console.log('구현되지 않은 메뉴:', menuId);
        break;
    }
  };

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
            // 계정 삭제 API 호출
            console.log('계정 삭제 요청');
          }
        }
      ]
    );
  };

  // 메뉴 구조 정의
  const menuSections = [
    {
      title: '내 정보',
      iconName: 'user',
      items: [
        {
          id: 'point-balance',
          title: '보유 포인트',
          subtitle: `${userStats.availablePoints?.toLocaleString() || '0'}P`,
          onPress: () => handleMenuPress('point-balance')
        },
        {
          id: 'my-meetups',
          title: '참가한 모임',
          subtitle: `총 ${userStats.totalMeetups || 0}회 참가`,
          onPress: () => handleMenuPress('my-meetups')
        },
        {
          id: 'review-management',
          title: '후기 관리',
          subtitle: `작성한 리뷰 ${userStats.reviewCount || 0}개`,
          onPress: () => handleMenuPress('review-management')
        }
      ]
    },
    {
      title: '활동관리',
      iconName: 'heart',
      items: [
        {
          id: 'wishlist',
          title: '찜 목록',
          subtitle: '관심있는 모임들',
          onPress: () => handleMenuPress('wishlist')
        },
        {
          id: 'recent-views',
          title: '최근 본 글',
          subtitle: '최근에 본 모임들',
          onPress: () => handleMenuPress('recent-views')
        },
        {
          id: 'blocked-users',
          title: '차단 회원관리',
          subtitle: '차단한 사용자 목록',
          onPress: () => handleMenuPress('blocked-users')
        },
        {
          id: 'my-reviews',
          title: '리뷰 관리',
          subtitle: '내가 작성한 리뷰들',
          onPress: () => handleMenuPress('my-reviews')
        }
      ]
    },
    {
      title: '결제 관리',
      iconName: 'credit-card',
      items: [
        {
          id: 'payment-history',
          title: '약속금 결제 내역',
          subtitle: '결제 및 환불 내역',
          onPress: () => handleMenuPress('payment-history')
        },
        {
          id: 'point-charge',
          title: '포인트 충전/ 사용',
          subtitle: '포인트 관리',
          onPress: () => handleMenuPress('point-charge')
        }
      ]
    },
    {
      title: '친구 & 초대',
      iconName: 'users',
      items: [
        {
          id: 'invite-friends',
          title: '친구코드/초대코드',
          subtitle: '친구를 초대하고 포인트 받기',
          onPress: () => handleMenuPress('invite-friends')
        }
      ]
    }
  ];

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
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 사용자 프로필 섹션 */}
        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            {/* 프로필 이미지 */}
            <View style={styles.profileImageContainer}>
              <ProfileImage 
                profileImage={userProfileImageUrl}
                name={user?.name || '사용자'}
                size={80}
              />
            </View>

            {/* 사용자 정보 */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || '사용자'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
              
              <View style={styles.userStatsRow}>
                <View style={styles.userStatItem}>
                  <Text style={styles.userStatValue}>{userStats.totalMeetups}</Text>
                  <Text style={styles.userStatLabel}>참여모임</Text>
                </View>
                <View style={styles.userStatItem}>
                  <Text style={styles.userStatValue}>{userStats.hostedMeetups}</Text>
                  <Text style={styles.userStatLabel}>주최모임</Text>
                </View>
                <View style={styles.userStatItem}>
                  <Text style={styles.userStatValue}>{userStats.reviewCount}</Text>
                  <Text style={styles.userStatLabel}>리뷰</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* 밥알지수 */}
          <View style={styles.riceIndexContainer}>
            <View style={styles.riceIndexHeader}>
              <Text style={styles.riceIndexLabel}>밥알지수</Text>
              <Text style={styles.riceIndexValue}>{userStats.riceIndex} 밥알</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill, 
                  { width: `${userStats.riceIndex}%` }
                ]} />
              </View>
            </View>
            
            {/* 뱃지 섹션 */}
            <View style={styles.badgeSection}>
              <Text style={styles.badgeLabel}>내 뱃지</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeEmoji}>🥇</Text>
                  <Text style={styles.badgeTitle}>첫걸음</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeEmoji}>🤝</Text>
                  <Text style={styles.badgeTitle}>밥친구</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeEmoji}>⭐</Text>
                  <Text style={styles.badgeTitle}>우수회원</Text>
                </View>
                <TouchableOpacity 
                  style={styles.moreBadges}
                  onPress={() => navigation.navigate('MyBadges')}
                >
                  <Text style={styles.moreBadgesText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* 메뉴 카드들 */}
        <View style={styles.menuContainer}>
          {menuSections.map((section, index) => (
            <MenuCard
              key={index}
              title={section.title}
              iconName={section.iconName}
              items={section.items}
            />
          ))}
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 52,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  
  // 프로필 섹션
  profileSection: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  userInfo: {
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
    marginBottom: 16,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  userStatItem: {
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  
  // 밥알지수
  riceIndexContainer: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 16,
  },
  riceIndexHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riceIndexLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  riceIndexValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 4,
  },
  
  // 메뉴 컨테이너
  menuContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  
  // 메뉴 카드
  menuCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  menuCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  menuCardContent: {
    paddingVertical: 8,
  },
  
  // 메뉴 아이템
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  
  // 뱃지 스타일
  badgeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    ...SHADOWS.small,
  },
  badgeEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  moreBadges: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  moreBadgesText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '600',
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