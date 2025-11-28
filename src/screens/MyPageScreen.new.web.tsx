import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { Icon } from '../components/Icon';
import userApiService from '../services/userApiService';
import { ProfileImage } from '../components/ProfileImage';
import {
  User, Award, Gift, Users, Heart, Eye, UserX, FileText, 
  CreditCard, DollarSign, UserPlus, Bell, HelpCircle, 
  Phone, FileCheck, Info, Settings, LogOut, Trash2
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyPageScreenProps {
  user?: User | null;
}

// 메뉴 카드 컴포넌트
const MenuCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    onPress: () => void;
    color?: string;
  }>;
}> = ({ title, icon, items }) => (
  <View style={styles.menuCard}>
    <View style={styles.menuCardHeader}>
      <View style={styles.menuCardIcon}>
        {icon}
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
            <View style={[styles.menuItemIcon, { backgroundColor: item.color || COLORS.primary.light }]}>
              {item.icon}
            </View>
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

const MyPageScreen: React.FC<MyPageScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser, logout } = useUserStore();
  
  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  const [userStats, setUserStats] = useState({
    riceIndex: 84,
    availablePoints: 98500,
    totalMeetups: 12,
    hostedMeetups: 5,
    reviewCount: 8
  });

  const [loading, setLoading] = useState(true);
  const [userProfileImageUrl, setUserProfileImageUrl] = useState(null);

  // API에서 유저 데이터 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // 사용자 통계 가져오기
        const stats = await userApiService.getUserStats();
        setUserStats(stats);
        
        // 프로필 정보 가져오기
        const userData = await userApiService.getProfile();
        setUserProfileImageUrl(userData.profileImage);
        
      } catch (error) {
        console.error('유저 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // 메뉴 핸들러들
  const handleMenuPress = (menuId: string) => {
    console.log('메뉴 선택:', menuId);
    
    switch (menuId) {
      // 기본 정보
      case 'badge-info':
        navigate('/my-badges');
        break;
      case 'point-balance':
        navigate('/point-balance');
        break;
      case 'my-meetups':
        navigate('/my-meetups');
        break;
      case 'review-management':
        navigate('/my-reviews');
        break;
        
      // 활동 관리
      case 'wishlist':
        navigate('/wishlist');
        break;
      case 'recent-views':
        navigate('/recent-views');
        break;
      case 'blocked-users':
        navigate('/blocked-users');
        break;
      case 'my-reviews':
        navigate('/my-reviews');
        break;
        
      // 결제 관리
      case 'payment-history':
        navigate('/payment-history');
        break;
      case 'point-charge':
        navigate('/point-charge');
        break;
        
      // 친구 초대
      case 'invite-friends':
        navigate('/invite-friends');
        break;
        
      // 고객 지원
      case 'notices':
        navigate('/notices');
        break;
      case 'faq':
        navigate('/faq');
        break;
      case 'customer-support':
        navigate('/customer-support');
        break;
      case 'terms':
        navigate('/terms');
        break;
      case 'app-info':
        navigate('/app-info');
        break;
        
      // 설정
      case 'notification-settings':
        navigate('/notification-settings');
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
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      // 계정 삭제 API 호출
      console.log('계정 삭제 요청');
    }
  };

  // 메뉴 구조 정의
  const menuSections = [
    {
      title: '내 정보',
      icon: <User size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'badge-info',
          title: '뱃지 정보',
          subtitle: '획득한 뱃지를 확인해보세요',
          icon: <Award size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('badge-info'),
          color: '#FFB800'
        },
        {
          id: 'point-balance',
          title: '보유 포인트',
          subtitle: `${userStats.availablePoints?.toLocaleString() || '0'}P`,
          icon: <Gift size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('point-balance'),
          color: '#FF6B6B'
        },
        {
          id: 'my-meetups',
          title: '참가한 모임',
          subtitle: `총 ${userStats.totalMeetups || 0}회 참가`,
          icon: <Users size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('my-meetups'),
          color: '#4ECDC4'
        },
        {
          id: 'review-management',
          title: '후기 관리',
          subtitle: `작성한 리뷰 ${userStats.reviewCount || 0}개`,
          icon: <FileText size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('review-management'),
          color: '#45B7D1'
        }
      ]
    },
    {
      title: '활동관리',
      icon: <Heart size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'wishlist',
          title: '찜 목록',
          subtitle: '관심있는 모임들',
          icon: <Heart size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('wishlist'),
          color: '#FF69B4'
        },
        {
          id: 'recent-views',
          title: '최근 본 글',
          subtitle: '최근에 본 모임들',
          icon: <Eye size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('recent-views'),
          color: '#9B59B6'
        },
        {
          id: 'blocked-users',
          title: '차단 회원관리',
          subtitle: '차단한 사용자 목록',
          icon: <UserX size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('blocked-users'),
          color: '#E74C3C'
        },
        {
          id: 'my-reviews',
          title: '리뷰 관리',
          subtitle: '내가 작성한 리뷰들',
          icon: <FileText size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('my-reviews'),
          color: '#3498DB'
        }
      ]
    },
    {
      title: '결제 관리',
      icon: <CreditCard size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'payment-history',
          title: '약속금 결제 내역',
          subtitle: '결제 및 환불 내역',
          icon: <CreditCard size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('payment-history'),
          color: '#2ECC71'
        },
        {
          id: 'point-charge',
          title: '포인트 충전/ 사용',
          subtitle: '포인트 관리',
          icon: <DollarSign size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('point-charge'),
          color: '#F39C12'
        }
      ]
    },
    {
      title: '친구 초대',
      icon: <UserPlus size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'invite-friends',
          title: '친구코드/초대코드',
          subtitle: '친구를 초대하고 포인트 받기',
          icon: <UserPlus size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('invite-friends'),
          color: '#8E44AD'
        }
      ]
    },
    {
      title: '고객 지원',
      icon: <HelpCircle size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'notices',
          title: '공지사항',
          subtitle: '최신 소식과 공지',
          icon: <Bell size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('notices'),
          color: '#FF6B35'
        },
        {
          id: 'faq',
          title: '자주 묻는 질문',
          subtitle: 'FAQ 및 도움말',
          icon: <HelpCircle size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('faq'),
          color: '#1ABC9C'
        },
        {
          id: 'customer-support',
          title: '고객 센터',
          subtitle: '문의사항 등록 및 확인',
          icon: <Phone size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('customer-support'),
          color: '#34495E'
        },
        {
          id: 'terms',
          title: '약관 및 정책',
          subtitle: '이용약관 및 개인정보처리방침',
          icon: <FileCheck size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('terms'),
          color: '#95A5A6'
        },
        {
          id: 'app-info',
          title: '버전 정보',
          subtitle: 'v1.0.0',
          icon: <Info size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('app-info'),
          color: '#7F8C8D'
        }
      ]
    },
    {
      title: '설정',
      icon: <Settings size={20} color={COLORS.primary.main} />,
      items: [
        {
          id: 'notification-settings',
          title: '알림 설정',
          subtitle: '푸시 알림 설정 관리',
          icon: <Bell size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('notification-settings'),
          color: '#6C5CE7'
        },
        {
          id: 'logout',
          title: '로그아웃',
          subtitle: '안전하게 로그아웃',
          icon: <LogOut size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('logout'),
          color: '#FD79A8'
        },
        {
          id: 'delete-account',
          title: '회원 탈퇴',
          subtitle: '계정을 영구적으로 삭제',
          icon: <Trash2 size={16} color={COLORS.neutral.white} />,
          onPress: () => handleMenuPress('delete-account'),
          color: '#D63031'
        }
      ]
    }
  ];

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
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="bell" size={24} color={COLORS.text.primary} />
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
          </View>
        </View>

        {/* 메뉴 카드들 */}
        <View style={styles.menuContainer}>
          {menuSections.map((section, index) => (
            <MenuCard
              key={index}
              title={section.title}
              icon={section.icon}
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
    paddingTop: 20,
    paddingBottom: 16,
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
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  
  bottomSpacing: {
    height: 40,
  },
});

export default MyPageScreen;