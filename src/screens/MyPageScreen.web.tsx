import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyPageScreenProps {
  user?: User | null;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser } = useUserStore();
  
  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  const [userStats, setUserStats] = useState({
    riceIndex: 70,
    availablePoints: 100,
    totalMeetups: 0,
    hostedMeetups: 0,
    reviewCount: 5
  });

  const [loading, setLoading] = useState(true);

  // 메뉴 섹션들 - 마이페이지 특화 기능들
  const menuSections = [
    {
      title: '리뷰 관리',
      items: [
        { id: 'my-reviews', title: '내가 쓴 리뷰' },
        { id: 'review-management', title: '리뷰 관리' },
        { id: 'wishlist', title: '관심 모임' }
      ]
    },
    {
      title: '계정 관리', 
      items: [
        { id: 'profile-edit', title: '프로필 수정' },
        { id: 'notification-settings', title: '알림 설정' },
        { id: 'privacy-settings', title: '개인정보 설정' }
      ]
    },
    {
      title: '포인트 관리',
      items: [
        { id: 'point-charge', title: '포인트 충전' },
        { id: 'point-history', title: '포인트 사용 내역' }
      ]
    }
  ];

  // API에서 유저 통계 데이터 가져오기
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/stats');
        setUserStats(response.data.stats);
      } catch (error) {
        console.error('유저 통계 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const handleMenuPress = (menuId: string) => {
    console.log('메뉴 선택:', menuId);
    
    switch (menuId) {
      case 'my-reviews':
        navigate('/my-reviews');
        break;
        
      case 'review-management':
        navigate('/review-management');
        break;
        
      case 'wishlist':
        navigate('/wishlist');
        break;
        
      case 'profile-edit':
        navigate('/profile-edit');
        break;
        
      case 'notification-settings':
        navigate('/notification-settings');
        break;
        
      case 'privacy-settings':
        navigate('/privacy-settings');
        break;
        
      case 'point-charge':
        navigate('/point-charge');
        break;
        
      case 'point-history':
        navigate('/point-history');
        break;
        
      default:
        console.log('구현되지 않은 메뉴:', menuId);
        break;
    }
  };

  const renderMenuItem = (item: any) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item.id)}
    >
      <Text style={styles.menuItemText}>{item.title}</Text>
      <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
    </TouchableOpacity>
  );

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

      <ScrollView style={styles.content}>
        {/* 프로필 섹션 */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              <Text style={styles.profileInitial}>경</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
          
          {/* 밥알지수 진행바 */}
          <View style={styles.riceIndexContainer}>
            <View style={styles.riceIndexRow}>
              <Text style={styles.riceIndexLabel}>밥알지수</Text>
              <Text style={styles.riceIndexValue}>{userStats.riceIndex} 밥알</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${userStats.riceIndex}%` }]} />
              </View>
              <Text style={styles.totalPoints}>{userStats.availablePoints} 포인트</Text>
            </View>
          </View>
        </View>

        {/* 활동 통계 */}
        <View style={styles.activityStatsSection}>
          <TouchableOpacity 
            style={styles.activityStatRow} 
            onPress={() => navigate('/point-history')}
          >
            <Text style={styles.activityStatLabel}>보유한 포인트</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.availablePoints.toLocaleString()}원</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.activityStatRow} 
            onPress={() => navigate('/my-meetups')}
          >
            <Text style={styles.activityStatLabel}>함께한 모임</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.totalMeetups}회</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.activityStatRow, styles.lastStatRow]} 
            onPress={() => navigate('/my-reviews')}
          >
            <Text style={styles.activityStatLabel}>우수 리뷰</Text>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.reviewCount}개</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 메뉴 섹션들 */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuContainer}>
              {section.items.map(renderMenuItem)}
            </View>
          </View>
        ))}

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
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
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 24,
  },
  // 밥알지수 진행바
  riceIndexContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  riceIndexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riceIndexLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  riceIndexValue: {
    fontSize: 16,
    color: '#F5B041',
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5B041',
    borderRadius: 20,
  },
  totalPoints: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  // 포인트 박스
  pointsBox: {
    backgroundColor: '#F5B041',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // 활동 통계
  activityStatsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  activityStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityStatLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  activityStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastStatRow: {
    borderBottomWidth: 0,
  },
  // 메뉴 섹션
  menuSection: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
});

export default MyPageScreen;