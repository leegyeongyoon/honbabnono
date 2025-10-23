import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
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

const MyPageScreen: React.FC<MyPageScreenProps> = ({ navigation, user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [hostedMeetups, setHostedMeetups] = useState<HostedMeetup[]>([]);
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [riceIndex, setRiceIndex] = useState<number>(0);
  const [riceLevel, setRiceLevel] = useState<any>(null);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadUserData();
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

  return (
    <View style={styles.container}>
      {/* 당근마켓 스타일 프로필 헤더 */}
      <View style={styles.profileHeader}>
        <View style={styles.profileTopRow}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.charAt(0) || '혼'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || '혼밥러'}</Text>
            <Text style={styles.profileId}>#{user?.id ? String(user.id).slice(0, 8) : '1181301'}</Text>
          </View>
          <TouchableOpacity style={styles.profileEditButton}>
            <Text style={styles.profileEditText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 밥알지수 섹션 (당근마켓 매너온도 스타일) */}
        <View style={styles.riceIndexSection}>
          <View style={styles.riceIndexHeader}>
            <Text style={styles.riceIndexLabel}>밥알지수</Text>
            <TouchableOpacity>
              <Text style={styles.infoIcon}>ⓘ</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.temperatureContainer}>
            <Text style={styles.firstTemperature}>첫 온도 36.5°C</Text>
            <View style={styles.currentTemperatureContainer}>
              <Text style={styles.currentTemperature}>{riceIndex}밥알</Text>
              <Text style={styles.temperatureEmoji}>
                {riceLevel?.emoji || '🍚'}
              </Text>
            </View>
          </View>

          {/* 온도 바 */}
          <View style={styles.temperatureBar}>
            <View style={[styles.temperatureProgress, { 
              width: `${Math.min((riceIndex / 100) * 100, 100)}%`,
              backgroundColor: riceLevel?.color || COLORS.neutral.grey400
            }]} />
          </View>

          {/* 온도 설명 */}
          <View style={styles.temperatureDescription}>
            <View style={styles.temperatureStats}>
              <View style={styles.tempStat}>
                <Text style={styles.tempStatIcon}>👤</Text>
                <Text style={styles.tempStatText}>재거래희망률 100%</Text>
              </View>
              <View style={styles.tempStat}>
                <Text style={styles.tempStatIcon}>💬</Text>
                <Text style={styles.tempStatText}>응답률 100%</Text>
              </View>
            </View>
            <Text style={styles.tempStatDetail}>13일 후 3번째 거래</Text>
            <Text style={styles.tempStatDetail}>최근 3일 이내 활동 (20204년 6월 가입)</Text>
          </View>

          {/* 레벨 정보 */}
          {riceLevel && (
            <View style={styles.levelContainer}>
              <Text style={[styles.levelName, { color: riceLevel.color }]}>
                {riceLevel.level}
              </Text>
              <Text style={styles.levelDescription}>
                {riceLevel.description}
              </Text>
            </View>
          )}
        </View>

        {/* 활동 통계 */}
        <View style={styles.statsSection}>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.joinedMeetups || 0}</Text>
            <Text style={styles.statLabel}>참여</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.hostedMeetups || 0}</Text>
            <Text style={styles.statLabel}>호스팅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.completedMeetups || 0}</Text>
            <Text style={styles.statLabel}>완료</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 콘텐츠 */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 내 활동 */}
            {renderMeetupList('참여한 모임', joinedMeetups, true)}
            {renderMeetupList('만든 모임', hostedMeetups, true)}
            
            {/* 내 리뷰 */}
            {renderMyReviews()}
            
            {/* 설정 */}
            {renderSettings()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  profileHeader: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.neutral.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  profileId: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  profileEditButton: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileEditText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  riceIndexSection: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  riceIndexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  riceIndexLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  infoIcon: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  firstTemperature: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  currentTemperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTemperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginRight: 8,
  },
  temperatureEmoji: {
    fontSize: 20,
  },
  temperatureBar: {
    height: 8,
    backgroundColor: COLORS.neutral.grey300,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  temperatureProgress: {
    height: '100%',
    borderRadius: 4,
  },
  temperatureDescription: {
    marginBottom: 12,
  },
  temperatureStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tempStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tempStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  tempStatText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  tempStatDetail: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  levelContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey300,
  },
  levelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 8,
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  activitySection: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
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
    marginTop: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  },
  logoutText: {
    color: COLORS.functional.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
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
    marginBottom: 1,
    padding: 16,
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