import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import userApiService, { ActivityStats, HostedMeetup, JoinedMeetup } from '../services/userApiService';
import reviewApiService, { UserReview } from '../services/reviewApiService';

interface MyPageScreenProps {
  navigation?: any;
  user?: any;
  onLogout?: () => void;
}

const { width } = Dimensions.get('window');

const MyPageScreen: React.FC<MyPageScreenProps> = ({ navigation, user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [hostedMeetups, setHostedMeetups] = useState<HostedMeetup[]>([]);
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [riceIndex, setRiceIndex] = useState<number>(0);
  const [riceLevel, setRiceLevel] = useState<any>(null);
  const scrollY = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadUserData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // 사용자 데이터 로드
  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivityStats(),
        loadHostedMeetups(),
        loadJoinedMeetups(),
        loadUserReviews(),
        loadRiceIndex()
      ]);
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 활동 통계 로드
  const loadActivityStats = async () => {
    try {
      const stats = await userApiService.getActivityStats();
      setActivityStats(stats);
    } catch (error) {
      console.error('활동 통계 로드 실패:', error);
    }
  };

  // 호스팅한 모임 로드
  const loadHostedMeetups = async () => {
    try {
      const { data } = await userApiService.getHostedMeetups(1, 5); // 최근 5개만
      setHostedMeetups(data);
    } catch (error) {
      console.error('호스팅 모임 로드 실패:', error);
    }
  };

  // 참가한 모임 로드
  const loadJoinedMeetups = async () => {
    try {
      const { data } = await userApiService.getJoinedMeetups(1, 5); // 최근 5개만
      setJoinedMeetups(data);
    } catch (error) {
      console.error('참가 모임 로드 실패:', error);
    }
  };

  // 사용자 리뷰 로드
  const loadUserReviews = async () => {
    try {
      const { data } = await reviewApiService.getUserReviews(1, 5); // 최근 5개
      setUserReviews(data);
    } catch (error) {
      console.error('사용자 리뷰 로드 실패:', error);
    }
  };

  // 밥알지수 로드
  const loadRiceIndex = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/user/rice-index`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setRiceIndex(data.riceIndex);
        setRiceLevel(data.level);
      }
    } catch (error) {
      console.error('밥알지수 로드 실패:', error);
    }
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // 설정 메뉴
  const settingsMenu = [
    { id: 'profile', title: '프로필 관리', icon: 'user', action: () => console.log('프로필 관리') },
    { id: 'notification', title: '알림 설정', icon: 'bell', action: () => console.log('알림 설정') },
    { id: 'privacy', title: '개인정보 관리', icon: 'shield', action: () => console.log('개인정보 관리') },
    { id: 'help', title: '도움말', icon: 'help-circle', action: () => console.log('도움말') },
    { id: 'terms', title: '이용약관', icon: 'file-text', action: () => console.log('이용약관') },
    { id: 'logout', title: '로그아웃', icon: 'log-out', action: () => handleLogout() },
  ];

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            
            // 로그아웃 API 호출
            const token = localStorage.getItem('token');
            if (token) {
              await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/logout`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
            }
            
            // 로컬 스토리지에서 토큰 제거
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // 로그아웃 콜백 실행
            onLogout?.();
            
            Alert.alert('알림', '로그아웃되었습니다.');
          } catch (error) {
            console.error('로그아웃 실패:', error);
            // 에러가 발생해도 로컬 토큰은 제거
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            onLogout?.();
            Alert.alert('알림', '로그아웃되었습니다.');
          } finally {
            setLoading(false);
          }
        } },
      ]
    );
  };

  const renderMeetupList = (title: string, meetups: (HostedMeetup | JoinedMeetup)[], showViewAll: boolean = false) => (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {showViewAll && meetups.length > 0 && (
          <TouchableOpacity>
            <Text style={styles.viewAllText}>전체보기</Text>
          </TouchableOpacity>
        )}
      </View>
      {meetups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>활동 내역이 없습니다</Text>
        </View>
      ) : (
        meetups.map((meetup) => (
          <TouchableOpacity key={meetup.id} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{meetup.title}</Text>
              <Text style={styles.activityLocation}>{meetup.location}</Text>
              <Text style={styles.activityDate}>{meetup.date} {meetup.time}</Text>
              {'hostName' in meetup && (
                <Text style={styles.hostName}>호스트: {meetup.hostName}</Text>
              )}
            </View>
            <View style={styles.activityRight}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meetup.status) }]}>
                <Text style={styles.statusText}>{meetup.status}</Text>
              </View>
              <Text style={styles.participantInfo}>
                {meetup.currentParticipants}/{meetup.maxParticipants}명
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.neutral.grey400;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      default: return COLORS.neutral.grey400;
    }
  };


  const renderMyReviews = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내가 작성한 리뷰</Text>
        <Text style={styles.reviewCount}>{userReviews.length}개</Text>
      </View>
      {userReviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>작성한 리뷰가 없습니다</Text>
          <Text style={styles.emptySubtext}>모임 참여 후 리뷰를 작성해보세요!</Text>
        </View>
      ) : (
        userReviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={14}
                      color={star <= review.rating ? COLORS.functional.warning : COLORS.neutral.grey300}
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>{review.rating}.0</Text>
              </View>
            </View>
            <Text style={styles.meetupInfo}>
              {review.meetup_location} • {review.meetup_date} • {review.meetup_category}
            </Text>
            {review.comment && (
              <Text style={styles.reviewComment}>{review.comment}</Text>
            )}
            {review.tags && review.tags.length > 0 && (
              <View style={styles.reviewTags}>
                {review.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>설정</Text>
      </View>
      {settingsMenu.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.settingsItem, item.id === 'logout' && styles.logoutItem]}
          onPress={item.action}
        >
          <View style={styles.settingsLeft}>
            <Icon name={item.icon as any} size={20} color={item.id === 'logout' ? COLORS.functional.error : COLORS.text.secondary} />
            <Text style={[styles.settingsTitle, item.id === 'logout' && styles.logoutText]}>
              {item.title}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* 모던한 프로필 헤더 */}
      <Animated.View style={[
        styles.profileHeader,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }
      ]}>
        <View style={styles.profileBackgroundGradient}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user?.name?.charAt(0) || '혼'}
                </Text>
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || '혼밥러'}</Text>
              <Text style={styles.profileId}>#{user?.id ? String(user.id).slice(0, 8) : '1181301'}</Text>
              <View style={styles.verifiedBadge}>
                <Icon name="check-circle" size={14} color={COLORS.functional.success} />
                <Text style={styles.verifiedText}>인증됨</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.profileEditButton}>
              <Icon name="edit-3" size={16} color={COLORS.primary.main} />
              <Text style={styles.profileEditText}>편집</Text>
            </TouchableOpacity>
          </View>

          {/* 밥알지수 섹션 - 모던 카드 스타일 */}
          <View style={styles.riceIndexCard}>
            <View style={styles.riceIndexHeader}>
              <View style={styles.riceIndexTitleContainer}>
                <Text style={styles.riceIndexLabel}>밥알지수</Text>
                <View style={styles.riceIndexBadge}>
                  <Text style={styles.riceIndexBadgeText}>HOT</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.infoButton}>
                <Icon name="info" size={16} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modernTemperatureContainer}>
              <View style={styles.temperatureMain}>
                <Text style={styles.modernCurrentTemperature}>{riceIndex}</Text>
                <Text style={styles.temperatureUnit}>밥알</Text>
                <Text style={styles.modernTemperatureEmoji}>
                  {riceLevel?.emoji || '🍚'}
                </Text>
              </View>
              <Text style={styles.modernFirstTemperature}>
                기본 지수에서 +{Math.max(0, riceIndex - 36)}
              </Text>
            </View>

            {/* 현대적인 진행 바 */}
            <View style={styles.modernTemperatureBar}>
              <Animated.View style={[
                styles.modernTemperatureProgress, 
                { 
                  width: `${Math.min((riceIndex / 100) * 100, 100)}%`,
                  backgroundColor: riceLevel?.color || COLORS.primary.main
                }
              ]} />
              <View style={styles.temperatureMarkers}>
                {[25, 50, 75].map(marker => (
                  <View key={marker} style={[styles.temperatureMarker, { left: `${marker}%` }]} />
                ))}
              </View>
            </View>

            {/* 모던한 통계 */}
            <View style={styles.modernStats}>
              <View style={styles.modernStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="users" size={16} color={COLORS.primary.main} />
                </View>
                <Text style={styles.modernStatValue}>100%</Text>
                <Text style={styles.modernStatLabel}>재참여율</Text>
              </View>
              <View style={styles.modernStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="message-circle" size={16} color={COLORS.functional.success} />
                </View>
                <Text style={styles.modernStatValue}>98%</Text>
                <Text style={styles.modernStatLabel}>응답률</Text>
              </View>
              <View style={styles.modernStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="clock" size={16} color={COLORS.functional.warning} />
                </View>
                <Text style={styles.modernStatValue}>5분</Text>
                <Text style={styles.modernStatLabel}>평균응답</Text>
              </View>
            </View>

            {/* 레벨 정보 - 더 모던하게 */}
            {riceLevel && (
              <View style={styles.modernLevelContainer}>
                <View style={[styles.levelBadge, { backgroundColor: riceLevel.color + '20' }]}>
                  <Text style={[styles.modernLevelName, { color: riceLevel.color }]}>
                    {riceLevel.level}
                  </Text>
                </View>
                <Text style={styles.modernLevelDescription}>
                  {riceLevel.description}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 모던한 활동 통계 */}
        <View style={styles.modernStatsSection}>
          <Animated.View style={[styles.modernStatCard, { opacity: fadeAnim }]}>
            <View style={styles.statIconCircle}>
              <Icon name="calendar" size={20} color={COLORS.primary.main} />
            </View>
            <Text style={styles.modernStatNumber}>{activityStats?.joinedMeetups || 0}</Text>
            <Text style={styles.modernStatLabel}>참여한 모임</Text>
            <View style={styles.statGrowth}>
              <Icon name="trending-up" size={12} color={COLORS.functional.success} />
              <Text style={styles.statGrowthText}>+3</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.modernStatCard, { opacity: fadeAnim }]}>
            <View style={styles.statIconCircle}>
              <Icon name="star" size={20} color={COLORS.functional.warning} />
            </View>
            <Text style={styles.modernStatNumber}>{activityStats?.hostedMeetups || 0}</Text>
            <Text style={styles.modernStatLabel}>호스팅</Text>
            <View style={styles.statGrowth}>
              <Icon name="trending-up" size={12} color={COLORS.functional.success} />
              <Text style={styles.statGrowthText}>+1</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.modernStatCard, { opacity: fadeAnim }]}>
            <View style={styles.statIconCircle}>
              <Icon name="check-circle" size={20} color={COLORS.functional.success} />
            </View>
            <Text style={styles.modernStatNumber}>{activityStats?.completedMeetups || 0}</Text>
            <Text style={styles.modernStatLabel}>완료</Text>
            <View style={styles.statCompletion}>
              <Text style={styles.statCompletionText}>100%</Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      {/* 메인 콘텐츠 */}
      <Animated.ScrollView 
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.modernLoadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.modernLoadingText}>데이터를 불러오는 중...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* 빠른 액션 메뉴 */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>빠른 실행</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickActionItem}>
                  <View style={styles.quickActionIcon}>
                    <Icon name="plus" size={20} color={COLORS.primary.main} />
                  </View>
                  <Text style={styles.quickActionText}>모임 만들기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem}>
                  <View style={styles.quickActionIcon}>
                    <Icon name="search" size={20} color={COLORS.functional.success} />
                  </View>
                  <Text style={styles.quickActionText}>모임 찾기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem}>
                  <View style={styles.quickActionIcon}>
                    <Icon name="heart" size={20} color={COLORS.functional.error} />
                  </View>
                  <Text style={styles.quickActionText}>관심 목록</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionItem}>
                  <View style={styles.quickActionIcon}>
                    <Icon name="gift" size={20} color={COLORS.functional.warning} />
                  </View>
                  <Text style={styles.quickActionText}>이벤트</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 내 활동 - 모던 스타일 */}
            {renderMeetupList('참여한 모임', joinedMeetups, true)}
            {renderMeetupList('만든 모임', hostedMeetups, true)}
            
            {/* 내 리뷰 */}
            {renderMyReviews()}
            
            {/* 설정 */}
            {renderSettings()}
          </Animated.View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  profileBackgroundGradient: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    backdropFilter: 'blur(10px)',
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.neutral.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.functional.success,
    borderWidth: 3,
    borderColor: COLORS.neutral.white,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.neutral.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.functional.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    color: COLORS.functional.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  profileEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: COLORS.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileEditText: {
    fontSize: 14,
    color: COLORS.neutral.white,
    fontWeight: '600',
    marginLeft: 6,
  },
  riceIndexCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  riceIndexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  riceIndexTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riceIndexLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  riceIndexBadge: {
    backgroundColor: COLORS.functional.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  riceIndexBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.neutral.white,
  },
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
  },
  modernTemperatureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  temperatureMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernCurrentTemperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  temperatureUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: 4,
    marginRight: 8,
  },
  modernTemperatureEmoji: {
    fontSize: 24,
  },
  modernFirstTemperature: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  modernTemperatureBar: {
    height: 12,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  modernTemperatureProgress: {
    height: '100%',
    borderRadius: 20,
    position: 'relative',
  },
  temperatureMarkers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  temperatureMarker: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modernStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  modernStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  modernLevelContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  modernLevelName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modernLevelDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modernStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modernStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  statGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.functional.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statGrowthText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.functional.success,
    marginLeft: 2,
  },
  statCompletion: {
    backgroundColor: COLORS.functional.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statCompletionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.functional.success,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  quickActionsContainer: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  activitySection: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.white,
  },
  settingsSection: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsTitle: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  logoutText: {
    color: COLORS.functional.error,
  },
  modernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.main + '20',
    marginBottom: 16,
  },
  modernLoadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  activityLocation: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  participantInfo: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  reviewsSection: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  meetupInfo: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'right',
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default MyPageScreen;