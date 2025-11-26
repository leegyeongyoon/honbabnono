import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { Icon } from '../components/Icon';
import { Users, Target, FileText, Gift, Award, Home, Star, TrendingUp, Crown, MapPin, Heart } from 'lucide-react';
import apiClient from '../services/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyPageScreenProps {
  user?: User | null;
}

// 원형 진행바 컴포넌트
const CircularProgress: React.FC<{ 
  progress: number; 
  size: number; 
  strokeWidth: number; 
  color: string;
  backgroundColor: string;
}> = ({ progress, size, strokeWidth, color, backgroundColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div 
      style={{
        width: size,
        height: size,
        position: 'relative',
        transform: 'rotate(-90deg)'
      }}
    >
      <svg width={size} height={size}>
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 진행 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
    </div>
  );
};

// 기본 프로필 이미지 컴포넌트 (귀여운 밥알 캐릭터)
const DefaultProfileImage: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <div 
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #F5F5DC 0%, #E6E6DC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      border: '2px solid #E0E0E0'
    }}
  >
    {/* 밥알 모양 */}
    <div
      style={{
        width: size * 0.5,
        height: size * 0.7,
        background: 'linear-gradient(135deg, #FFFEF7 0%, #F5F5DC 50%, #E6E6DC 100%)',
        borderRadius: `${size * 0.25}px / ${size * 0.35}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {/* 눈 */}
      <div style={{ display: 'flex', gap: size * 0.08, marginTop: size * 0.1 }}>
        <div
          style={{
            width: size * 0.06,
            height: size * 0.06,
            backgroundColor: '#333',
            borderRadius: '50%'
          }}
        />
        <div
          style={{
            width: size * 0.06,
            height: size * 0.06,
            backgroundColor: '#333',
            borderRadius: '50%'
          }}
        />
      </div>
      
      {/* 입 */}
      <div
        style={{
          width: size * 0.12,
          height: size * 0.06,
          border: '1.5px solid #333',
          borderTop: 'none',
          borderRadius: '0 0 50px 50px',
          marginTop: size * 0.02
        }}
      />
    </div>
  </div>
);

// 뱃지 컴포넌트
const Badge: React.FC<{ 
  title: string; 
  emoji?: string;
  icon: React.ReactNode; 
  description: string;
  requirement?: string;
  progress?: number;
  target?: number;
  progressPercent?: number;
  earned: boolean;
}> = ({ title, emoji, icon, description, requirement, progress, target, progressPercent, earned }) => (
  <TouchableOpacity style={[styles.badge, !earned && styles.badgeDisabled]}>
    <View style={[styles.badgeIconContainer, !earned && styles.badgeIconDisabled]}>
      {earned ? (
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      ) : (
        <Text style={{ fontSize: 16, opacity: 0.5 }}>{emoji}</Text>
      )}
    </View>
    
    <Text style={[styles.badgeTitle, !earned && styles.badgeTitleDisabled]}>
      {title} {earned && '✓'}
    </Text>
    
    <Text style={[styles.badgeDescription, !earned && styles.badgeDescriptionDisabled]}>
      {earned ? description : requirement || description}
    </Text>

    {!earned && progress !== undefined && target !== undefined && (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(progressPercent || 0, 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {progress}/{target}
        </Text>
      </View>
    )}

    {!earned && (
      <Text style={styles.badgeStatus}>미획득</Text>
    )}
  </TouchableOpacity>
);

// 밥알지수 색상 및 레벨 시스템
const getRiceIndexColor = (riceIndex: number) => {
  if (riceIndex >= 90) return COLORS.functional.error; // 빨간색 - 최고급
  if (riceIndex >= 80) return '#FF9500'; // 주황색 - 고급
  if (riceIndex >= 70) return '#F5B041'; // 황금색 - 중급
  if (riceIndex >= 50) return '#28A745'; // 초록색 - 초급
  if (riceIndex >= 30) return '#007BFF'; // 파란색 - 새싹
  return '#6C757D'; // 회색 - 시작
};

const getRiceIndexLevel = (riceIndex: number) => {
  if (riceIndex >= 90) return { title: '밥신', emoji: '🍚👑' };
  if (riceIndex >= 80) return { title: '밥마스터', emoji: '🍚⭐' };
  if (riceIndex >= 70) return { title: '따끈한 밥그릇', emoji: '🍚🔥' };
  if (riceIndex >= 50) return { title: '든든한 밥그릇', emoji: '🍚💪' };
  if (riceIndex >= 30) return { title: '새내기 밥그릇', emoji: '🍚🌱' };
  return { title: '밥알 초보', emoji: '🍚👶' };
};

const getNextLevelRequirement = (riceIndex: number) => {
  if (riceIndex >= 90) return 0; // 최고 레벨
  if (riceIndex >= 80) return 90 - riceIndex;
  if (riceIndex >= 70) return 80 - riceIndex;
  if (riceIndex >= 50) return 70 - riceIndex;
  if (riceIndex >= 30) return 50 - riceIndex;
  return 30 - riceIndex;
};

const MyPageScreen: React.FC<MyPageScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser, updateProfile } = useUserStore();
  
  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  const [userStats, setUserStats] = useState({
    riceIndex: 84,
    availablePoints: 98500,
    totalMeetups: 12,
    hostedMeetups: 5,
    reviewCount: 8,
    level: '따끈한 밥그릇',
    levelEmoji: '🍚🍚🍚'
  });

  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: '',
    profileImage: null,
    profileImageUrl: null
  });

  // 사용자 프로필 이미지 URL 상태
  const [userProfileImageUrl, setUserProfileImageUrl] = useState(null);

  // 뱃지 데이터
  const [badges, setBadges] = useState([]);

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

    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get('/user/profile');
        if (response.data.success && response.data.user) {
          const userData = response.data.user;
          setUserProfileImageUrl(userData.profileImage);
          setProfileData(prev => ({
            ...prev,
            name: userData.name || user?.name || '',
            bio: userData.bio || '',
            profileImageUrl: userData.profileImage
          }));
        }
      } catch (error) {
        console.error('프로필 정보 조회 실패:', error);
      }
    };

    const fetchUserBadges = async () => {
      try {
        const response = await apiClient.get('/user/badges');
        
        // 아이콘 매핑 객체
        const iconMap = {
          'first_meetup': <Star size={16} color={COLORS.primary.main} />,
          'meetup_king': <Crown size={16} color={COLORS.primary.main} />,
          'host_master': <Home size={16} color={COLORS.primary.main} />,
          'reviewer': <FileText size={16} color={COLORS.primary.main} />,
          'friend_maker': <Heart size={16} color={COLORS.primary.main} />,
          'explorer': <MapPin size={16} color={COLORS.primary.main} />
        };
        
        // 서버에서 받은 뱃지 데이터에 아이콘 추가
        const badgesWithIcons = response.data.badges.map(badge => ({
          ...badge,
          icon: iconMap[badge.id] || <Star size={16} color={COLORS.primary.main} />
        }));
        
        // 획득한 뱃지를 맨 앞으로 정렬
        const sortedBadges = badgesWithIcons.sort((a, b) => {
          if (a.earned && !b.earned) return -1;  // 획득한 뱃지가 앞으로
          if (!a.earned && b.earned) return 1;   // 미획득 뱃지가 뒤로
          return 0;  // 같은 상태면 기존 순서 유지
        });
        
        setBadges(sortedBadges);
        
        // 새로 획득한 뱃지가 있으면 알림 표시 (옵션)
        if (response.data.newBadges && response.data.newBadges.length > 0) {
          console.log('🏆 새 뱃지 획득:', response.data.newBadges);
        }
      } catch (error) {
        console.error('뱃지 정보 조회 실패:', error);
        // 실패시 기본 뱃지 표시
        setBadges([
          { id: 'first_meetup', title: '첫 모임', icon: <Star size={16} color={COLORS.primary.main} />, description: '첫 번째 모임 참여', earned: false },
          { id: 'meetup_king', title: '모임왕', icon: <Crown size={16} color={COLORS.primary.main} />, description: '10회 이상 모임 참여', earned: false },
          { id: 'host_master', title: '호스트', icon: <Home size={16} color={COLORS.primary.main} />, description: '모임 개최하기', earned: false },
          { id: 'reviewer', title: '리뷰어', icon: <FileText size={16} color={COLORS.primary.main} />, description: '리뷰 10개 이상 작성', earned: false },
          { id: 'friend_maker', title: '밥친구', icon: <Heart size={16} color={COLORS.primary.main} />, description: '같은 사람과 3회 모임', earned: false },
          { id: 'explorer', title: '탐험가', icon: <MapPin size={16} color={COLORS.primary.main} />, description: '5개 지역 모임 참여', earned: false }
        ]);
      }
    };

    if (user) {
      fetchUserStats();
      fetchUserProfile();
      fetchUserBadges();
    }
  }, [user]);

  // 프로필 저장 함수
  const handleSaveProfile = async () => {
    try {
      let profileImageUrl = null;
      
      // 이미지가 있으면 먼저 업로드
      if (profileData.profileImage) {
        console.log('🔄 이미지 업로드 시작:', {
          hasFile: !!profileData.profileImage,
          fileType: profileData.profileImage?.type,
          fileSize: profileData.profileImage?.size,
          fileName: profileData.profileImage?.name
        });

        const formData = new FormData();
        formData.append('profileImage', profileData.profileImage);
        
        // FormData 내용 확인
        console.log('📦 FormData 준비 완료:', {
          hasFormData: !!formData,
          hasFile: formData.has('profileImage')
        });
        
        try {
          console.log('🚀 API 호출 시작: /user/upload-profile-image');
          
          const uploadResponse = await apiClient.post('/api/user/upload-profile-image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          console.log('✅ 업로드 응답 받음:', uploadResponse.data);
          
          if (uploadResponse.data.success) {
            profileImageUrl = uploadResponse.data.imageUrl;
            console.log('🖼️ 이미지 URL 설정됨:', profileImageUrl);
          }
        } catch (uploadError) {
          console.error('❌ 이미지 업로드 실패:', uploadError);
          console.error('에러 응답 데이터:', uploadError.response?.data);
          console.error('에러 상태 코드:', uploadError.response?.status);
          alert('이미지 업로드에 실패했습니다.');
          return;
        }
      }
      
      // 프로필 정보 업데이트
      const response = await apiClient.put('/api/user/profile', {
        name: profileData.name,
        bio: profileData.bio,
        profileImage: profileImageUrl
      });
      
      if (response.data.success) {
        // 성공적으로 저장되면 로컬 상태 업데이트
        console.log('프로필이 성공적으로 업데이트되었습니다.');
        alert('프로필이 성공적으로 업데이트되었습니다.');
        
        // 프로필 이미지 URL 업데이트 (우선 실행)
        if (profileImageUrl) {
          setUserProfileImageUrl(profileImageUrl);
          console.log('🔄 userProfileImageUrl 업데이트됨:', profileImageUrl);
        }
        
        // 사용자 스토어 업데이트
        updateProfile({
          name: profileData.name,
          profileImage: profileImageUrl
        });
        
        // profileData의 profileImageUrl도 업데이트
        setProfileData(prev => ({
          ...prev,
          profileImageUrl: profileImageUrl,
          profileImage: null // 파일 객체 초기화
        }));
        
        setShowProfileEdit(false);
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      alert('프로필 업데이트에 실패했습니다.');
    }
  };

  // 프로필 이미지 변경 함수
  const handleChangeProfileImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
          alert('파일 크기가 10MB를 초과할 수 없습니다.');
          return;
        }

        // 이미지 미리보기용 URL 생성
        const imageUrl = URL.createObjectURL(file);
        setProfileData(prev => ({ 
          ...prev, 
          profileImage: file,
          profileImageUrl: imageUrl
        }));
      }
    };
    input.click();
  };

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
        setShowProfileEdit(true);
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
          <View style={styles.profileRow}>
            {/* 왼쪽 프로필 이미지 */}
            <TouchableOpacity 
              style={styles.compactProfileImageContainer}
              onPress={() => setShowProfileEdit(true)}
            >
              <View style={styles.compactProfileImage}>
                {userProfileImageUrl ? (
                  <Image 
                    source={{ uri: userProfileImageUrl.startsWith('http') ? userProfileImageUrl : `http://localhost:3001${userProfileImageUrl}` }} 
                    style={styles.compactProfileImagePreview}
                  />
                ) : (
                  <DefaultProfileImage size={60} />
                )}
              </View>
              <View style={styles.editIconContainer}>
                <Icon name="edit-2" size={12} color={COLORS.text.white} />
              </View>
            </TouchableOpacity>

            {/* 오른쪽 사용자 정보 */}
            <View style={styles.userInfoContainer}>
              <View style={styles.userBasicInfo}>
                <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
              </View>
              
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

              <View style={styles.joinDateInfo}>
                <Text style={styles.joinDateText}>가입일: 2024.03.15</Text>
                <Text style={styles.memberTypeText}>• 정회원</Text>
              </View>
            </View>
          </View>
          
          {/* 밥알지수 진행바 */}
          <View style={styles.riceIndexContainer}>
            <View style={styles.riceIndexRow}>
              <Text style={styles.riceIndexLabel}>밥알지수</Text>
              <Text style={[styles.riceIndexValue, { color: getRiceIndexColor(userStats.riceIndex) }]}>
                {userStats.riceIndex} 밥알
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill, 
                  { 
                    width: `${userStats.riceIndex}%`,
                    backgroundColor: getRiceIndexColor(userStats.riceIndex)
                  }
                ]} />
              </View>
            </View>
            <View style={styles.levelContainer}>
              <Text style={styles.levelText}>{getRiceIndexLevel(userStats.riceIndex).title}</Text>
              <Text style={styles.levelEmoji}>{getRiceIndexLevel(userStats.riceIndex).emoji}</Text>
            </View>
          </View>

          {/* 다음 레벨까지의 정보 */}
          <View style={styles.nextLevelInfo}>
            <Text style={styles.nextLevelText}>
              다음 레벨까지 {getNextLevelRequirement(userStats.riceIndex)} 밥알 남음
            </Text>
            <Text style={styles.riceIndexTip}>
              💡 모임 참여와 리뷰 작성으로 밥알지수를 올려보세요!
            </Text>
          </View>
        </View>

        {/* 뱃지 시스템 */}
        <View style={styles.badgeSection}>
          <Text style={styles.sectionTitle}>획득한 뱃지</Text>
          <View style={styles.badgeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {badges.map((badge, index) => (
                <Badge
                  key={index}
                  title={badge.title}
                  emoji={badge.emoji}
                  icon={badge.icon}
                  description={badge.description}
                  requirement={badge.requirement}
                  progress={badge.progress}
                  target={badge.target}
                  progressPercent={badge.progressPercent}
                  earned={badge.earned}
                />
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 활동 통계 */}
        <View style={styles.activityStatsSection}>
          <Text style={styles.sectionTitle}>활동 현황</Text>
          
          <TouchableOpacity 
            style={styles.activityStatRow} 
            onPress={() => navigate('/my-meetups')}
          >
            <View style={styles.activityIconContainer}>
              <Users size={20} color={COLORS.primary.main} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityStatLabel}>참여한 모임</Text>
              <Text style={styles.activityDescription}>이번달 3회 참여</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.totalMeetups}회</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.activityStatRow}
            onPress={() => navigate('/my-meetups')}
          >
            <View style={styles.activityIconContainer}>
              <Target size={20} color={COLORS.primary.main} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityStatLabel}>주최한 모임</Text>
              <Text style={styles.activityDescription}>평균 만족도 4.8점</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.hostedMeetups}회</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.activityStatRow}
            onPress={() => navigate('/my-reviews')}
          >
            <View style={styles.activityIconContainer}>
              <FileText size={20} color={COLORS.primary.main} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityStatLabel}>작성한 리뷰</Text>
              <Text style={styles.activityDescription}>평균 별점 4.5점</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.reviewCount}개</Text>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.activityStatRow, styles.lastStatRow]} 
            onPress={() => navigate('/point-history')}
          >
            <View style={styles.activityIconContainer}>
              <Gift size={20} color={COLORS.primary.main} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityStatLabel}>보유 포인트</Text>
              <Text style={styles.activityDescription}>이번달 5,000P 적립</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={styles.activityStatValue}>{userStats.availablePoints.toLocaleString()}P</Text>
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

      {/* 프로필 수정 모달 */}
      {showProfileEdit && (
        <View style={styles.modalOverlay}>
          <View style={styles.profileEditModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProfileEdit(false)}>
                <Icon name="x" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>프로필 수정</Text>
              <TouchableOpacity 
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveText}>저장</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.editProfileImageContainer}>
                <View style={styles.editProfileImage}>
                  {profileData.profileImageUrl ? (
                    <Image 
                      source={{ uri: profileData.profileImageUrl.startsWith('http') ? profileData.profileImageUrl : `http://localhost:3001${profileData.profileImageUrl}` }} 
                      style={styles.editProfileImagePreview}
                    />
                  ) : (
                    <DefaultProfileImage size={100} />
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.changeImageButton}
                  onPress={handleChangeProfileImage}
                >
                  <Icon name="camera" size={20} color={COLORS.primary.main} />
                  <Text style={styles.changeImageText}>사진 변경</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  style={styles.profileInput}
                  value={profileData.name}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
                  placeholder="이름을 입력하세요"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>자기소개</Text>
                <TextInput
                  style={[styles.profileInput, styles.bioInput]}
                  value={profileData.bio}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))}
                  placeholder="간단한 자기소개를 써보세요"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: COLORS.neutral.background,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  compactProfileImageContainer: {
    marginRight: 16,
    position: 'relative',
  },
  compactProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactProfileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  compactProfileImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfoContainer: {
    flex: 1,
  },
  userBasicInfo: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  userStatsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userStatItem: {
    marginRight: 24,
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  joinDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinDateText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  memberTypeText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
    marginLeft: 4,
  },
  // 밥알지수 진행바
  riceIndexContainer: {
    width: '100%',
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
    color: COLORS.text.primary,
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
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5B041',
    borderRadius: 20,
  },
  levelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  levelEmoji: {
    fontSize: 16,
  },
  nextLevelInfo: {
    backgroundColor: 'rgba(245, 176, 65, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  nextLevelText: {
    fontSize: 13,
    color: '#F5B041',
    fontWeight: '600',
    marginBottom: 4,
  },
  riceIndexTip: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  // 프로필 이미지 수정
  editIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
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
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 18,
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
  // 활동 통계
  activityStatsSection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  activityStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityStatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  activityStatValue: {
    fontSize: 16,
    fontWeight: '700',
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
    color: COLORS.text.secondary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuContainer: {
    backgroundColor: COLORS.neutral.white,
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
    borderBottomColor: COLORS.neutral.grey200,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  // 뱃지 시스템
  badgeSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 20,
    ...SHADOWS.small,
  },
  badgeContainer: {
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 10,
    padding: 12,
    marginRight: 16,
    alignItems: 'center',
    width: 85,
    borderWidth: 1.5,
    borderColor: COLORS.secondary.light,
    ...SHADOWS.small,
  },
  badgeDisabled: {
    backgroundColor: COLORS.neutral.grey100,
    borderColor: COLORS.neutral.grey200,
  },
  badgeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconDisabled: {
    backgroundColor: COLORS.neutral.grey200,
    opacity: 0.5,
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 3,
  },
  badgeTitleDisabled: {
    color: COLORS.text.secondary,
  },
  badgeDescription: {
    fontSize: 9,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  badgeDescriptionDisabled: {
    color: COLORS.neutral.grey300,
  },
  progressContainer: {
    marginTop: 6,
    height: 4,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 8,
    color: COLORS.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  badgeStatus: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.neutral.grey400,
    marginTop: 2,
  },
  // 프로필 수정 모달
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  profileEditModal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  modalContent: {
    padding: 20,
  },
  editProfileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  editProfileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
  editProfileImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary.light,
    gap: 8,
  },
  changeImageText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  profileInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.white,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default MyPageScreen;