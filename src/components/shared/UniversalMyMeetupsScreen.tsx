import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Platform,
  SafeAreaView 
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import { NotificationBell } from '../NotificationBell';
import MeetupCard from '../MeetupCard';
import userApiService, { JoinedMeetup, HostedMeetup } from '../../services/userApiService';
import { formatKoreanDateTime } from '../../utils/dateUtils';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UniversalMyMeetupsScreenProps {
  navigation?: any;
  user?: User | null;
  onNavigate?: (screen: string, params?: any) => void;
  onGoBack?: () => void;
}

const UniversalMyMeetupsScreen: React.FC<UniversalMyMeetupsScreenProps> = ({
  navigation,
  user,
  onNavigate,
  onGoBack
}) => {
  const [activeTab, setActiveTab] = useState<'applied' | 'created' | 'past'>('applied');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedMeetups, setAppliedMeetups] = useState<JoinedMeetup[]>([]);
  const [createdMeetups, setCreatedMeetups] = useState<HostedMeetup[]>([]);
  const [pastMeetups, setPastMeetups] = useState<(JoinedMeetup | HostedMeetup)[]>([]);

  console.log('🔍 [UniversalMyMeetups] User 상태:', { user, activeTab });

  useEffect(() => {
    console.log('🔍 [UniversalMyMeetups] useEffect 실행됨, user:', user);
    if (user) {
      loadMeetupData();
    }
  }, [user]);

  const handleNavigate = (screen: string, params?: any) => {
    if (onNavigate) {
      onNavigate(screen, params);
    } else if (navigation?.navigate) {
      navigation.navigate(screen, params);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (screen === 'MeetupDetail' && params?.meetupId) {
        window.location.href = `/meetup/${params.meetupId}`;
      }
    }
  };

  const handleGoBackPress = () => {
    if (onGoBack) {
      onGoBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const loadMeetupData = async () => {
    console.log('🔍 [UniversalMyMeetups] loadMeetupData 시작, user:', user);
    if (!user) {
      console.log('❌ [UniversalMyMeetups] user가 없어서 종료');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 [UniversalMyMeetups] 데이터 로딩 시작');
      await Promise.all([
        loadAppliedMeetups(),
        loadCreatedMeetups(),
        loadPastMeetups()
      ]);
      console.log('🔍 [UniversalMyMeetups] 모든 데이터 로딩 완료');
    } catch (error) {
      console.error('❌ [UniversalMyMeetups] 모임 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppliedMeetups = async () => {
    try {
      console.log('🔍 [UniversalMyMeetups] 신청한 모임 로드 시작...');
      const response = await userApiService.getJoinedMeetups(1, 50);
      console.log('🔍 [UniversalMyMeetups] API 전체 응답:', response);
      const { data } = response;
      
      if (!Array.isArray(data)) {
        console.error('❌ [UniversalMyMeetups] 데이터가 배열이 아님:', data);
        setAppliedMeetups([]);
        return;
      }
      
      // 백엔드에서 받은 snake_case를 camelCase로 변환
      const transformedData = data.map(meetup => ({
        ...meetup,
        maxParticipants: meetup.max_participants || meetup.maxParticipants,
        currentParticipants: meetup.current_participants || meetup.currentParticipants,
        priceRange: meetup.price_range || meetup.priceRange,
        ageRange: meetup.age_range || meetup.ageRange,
        genderPreference: meetup.gender_preference || meetup.genderPreference,
        diningPreferences: meetup.dining_preferences || meetup.diningPreferences || {},
        promiseDepositAmount: meetup.promise_deposit_amount || meetup.promiseDepositAmount || 0,
        promiseDepositRequired: meetup.promise_deposit_required || meetup.promiseDepositRequired || false,
        createdAt: meetup.created_at || meetup.createdAt
      }));
      
      // 진행 중인 모임만 필터링 (지난 모임 제외)
      const activeMeetups = transformedData.filter(meetup => {
        const isActive = !['완료', '종료', '취소', '파토'].includes(meetup.status);
        console.log(`🔍 [UniversalMyMeetups] 참가모임 "${meetup.title}" 상태: "${meetup.status}" -> isActive: ${isActive}`);
        return isActive;
      });
      
      console.log('🔍 [UniversalMyMeetups] 필터링된 참가 모임:', activeMeetups.length, '개');
      setAppliedMeetups(activeMeetups);
    } catch (error) {
      console.error('신청한 모임 로드 실패:', error);
      setAppliedMeetups([]);
    }
  };

  const loadCreatedMeetups = async () => {
    try {
      console.log('🔍 [UniversalMyMeetups] 만든 모임 로드 시작...');
      const response = await userApiService.getHostedMeetups(1, 50);
      const { data } = response;
      
      if (!Array.isArray(data)) {
        console.error('❌ [UniversalMyMeetups] 호스팅 데이터가 배열이 아님:', data);
        setCreatedMeetups([]);
        return;
      }
      
      // 백엔드에서 받은 snake_case를 camelCase로 변환
      const transformedData = data.map(meetup => ({
        ...meetup,
        maxParticipants: meetup.max_participants || meetup.maxParticipants,
        currentParticipants: meetup.current_participants || meetup.currentParticipants,
        priceRange: meetup.price_range || meetup.priceRange,
        ageRange: meetup.age_range || meetup.ageRange,
        genderPreference: meetup.gender_preference || meetup.genderPreference,
        diningPreferences: meetup.dining_preferences || meetup.diningPreferences || {},
        promiseDepositAmount: meetup.promise_deposit_amount || meetup.promiseDepositAmount || 0,
        promiseDepositRequired: meetup.promise_deposit_required || meetup.promiseDepositRequired || false,
        createdAt: meetup.created_at || meetup.createdAt
      }));
      
      // 진행 중인 모임만 필터링
      const activeMeetups = transformedData.filter(meetup => {
        const isActive = !['완료', '종료', '취소', '파토'].includes(meetup.status);
        console.log(`🔍 [UniversalMyMeetups] 호스팅모임 "${meetup.title}" 상태: "${meetup.status}" -> isActive: ${isActive}`);
        return isActive;
      });
      
      console.log('🔍 [UniversalMyMeetups] 필터링된 호스팅 모임:', activeMeetups.length, '개');
      setCreatedMeetups(activeMeetups);
    } catch (error) {
      console.error('만든 모임 로드 실패:', error);
      setCreatedMeetups([]);
    }
  };

  const loadPastMeetups = async () => {
    try {
      console.log('🔍 [UniversalMyMeetups] 지난 모임 로드 시작...');
      
      // 참가한 모임과 호스팅한 모임을 모두 가져옴
      const [joinedResponse, hostedResponse] = await Promise.all([
        userApiService.getJoinedMeetups(1, 50),
        userApiService.getHostedMeetups(1, 50)
      ]);
      
      const joinedData = Array.isArray(joinedResponse.data) ? joinedResponse.data : [];
      const hostedData = Array.isArray(hostedResponse.data) ? hostedResponse.data : [];
      
      // 데이터 변환
      const transformedJoined = joinedData.map(meetup => ({
        ...meetup,
        maxParticipants: meetup.max_participants || meetup.maxParticipants,
        currentParticipants: meetup.current_participants || meetup.currentParticipants,
        priceRange: meetup.price_range || meetup.priceRange,
        ageRange: meetup.age_range || meetup.ageRange,
        genderPreference: meetup.gender_preference || meetup.genderPreference,
        diningPreferences: meetup.dining_preferences || meetup.diningPreferences || {},
        promiseDepositAmount: meetup.promise_deposit_amount || meetup.promiseDepositAmount || 0,
        promiseDepositRequired: meetup.promise_deposit_required || meetup.promiseDepositRequired || false,
        createdAt: meetup.created_at || meetup.createdAt
      }));
      
      const transformedHosted = hostedData.map(meetup => ({
        ...meetup,
        maxParticipants: meetup.max_participants || meetup.maxParticipants,
        currentParticipants: meetup.current_participants || meetup.currentParticipants,
        priceRange: meetup.price_range || meetup.priceRange,
        ageRange: meetup.age_range || meetup.ageRange,
        genderPreference: meetup.gender_preference || meetup.genderPreference,
        diningPreferences: meetup.dining_preferences || meetup.diningPreferences || {},
        promiseDepositAmount: meetup.promise_deposit_amount || meetup.promiseDepositAmount || 0,
        promiseDepositRequired: meetup.promise_deposit_required || meetup.promiseDepositRequired || false,
        createdAt: meetup.created_at || meetup.createdAt
      }));
      
      // 지난 모임 필터링 (완료/종료/취소/파토 모두 포함)
      const pastJoined = transformedJoined.filter(meetup => 
        ['완료', '종료', '취소', '파토'].includes(meetup.status)
      );
      const pastHosted = transformedHosted.filter(meetup => 
        ['완료', '종료', '취소', '파토'].includes(meetup.status)
      );
      
      // 두 배열을 합치고 날짜순으로 정렬
      const allPast = [...pastJoined, ...pastHosted].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      console.log('🔍 [UniversalMyMeetups] 전체 지난 모임:', allPast.length, '개');
      setPastMeetups(allPast);
    } catch (error) {
      console.error('지난 모임 로드 실패:', error);
      setPastMeetups([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetupData();
    setRefreshing(false);
  };

  const handleMeetupPress = (meetupId: string) => {
    console.log('🔍 [UniversalMyMeetups] 모임 클릭:', meetupId);
    handleNavigate('MeetupDetail', { meetupId });
  };

  const handleNotificationPress = () => {
    console.log('🔔 [UniversalMyMeetups] 알림 버튼 클릭됨');
    handleNavigate('Notification');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.functional.success;
      case '종료': return COLORS.functional.success;
      case '취소': return COLORS.functional.error;
      case '파토': return COLORS.functional.error;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      case '모집완료': return COLORS.primary.main;
      case '진행중': return COLORS.secondary?.main || COLORS.primary.main;
      default: return COLORS.neutral.grey400;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '완료': return '✅ 정상 완료';
      case '종료': return '✅ 정상 완료';
      case '취소': return '❌ 취소됨';
      case '파토': return '💥 파토됨';
      case '예정': return '⏰ 예정';
      case '모집중': return '🔥 모집중';
      case '모집완료': return '👥 모집완료';
      case '진행중': return '🍽️ 진행중';
      default: return status;
    }
  };

  const renderMeetupItem = (meetup: JoinedMeetup | HostedMeetup, showHostInfo: boolean = false, keyPrefix?: string) => (
    <MeetupCard
      key={keyPrefix ? `${keyPrefix}-${meetup.id}` : meetup.id}
      meetup={meetup}
      onPress={handleMeetupPress}
    />
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'applied':
        return (
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>신청한 모임 ({appliedMeetups.length}개)</Text>
            {appliedMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyText}>신청한 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>홈에서 모임을 찾아보세요!</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleNavigate('Home')}
                >
                  <Text style={styles.emptyButtonText}>모임 찾기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              appliedMeetups.map((meetup, index) => renderMeetupItem(meetup, true, `applied-${index}`))
            )}
          </View>
        );
      
      case 'created':
        return (
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>만든 모임 ({createdMeetups.length}개)</Text>
            {createdMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyText}>만든 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>새로운 모임을 만들어보세요!</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleNavigate('CreateMeetup')}
                >
                  <Text style={styles.emptyButtonText}>모임 만들기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              createdMeetups.map((meetup, index) => renderMeetupItem(meetup, false, `created-${index}`))
            )}
          </View>
        );
      
      case 'past':
        return (
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>지난 모임 ({pastMeetups.length}개)</Text>
            {pastMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyText}>지난 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>모임에 참여해보세요!</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleNavigate('Home')}
                >
                  <Text style={styles.emptyButtonText}>모임 찾기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pastMeetups.map((meetup, index) => renderMeetupItem(meetup, !('hostName' in meetup), `past-${index}`))
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBackPress}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
        
        <Text style={styles.headerTitle}>내 모임</Text>
        
        <View style={styles.headerRight}>
          {typeof NotificationBell !== 'undefined' && (
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={handleNotificationPress}
              color={COLORS.text.primary}
              size={20}
            />
          )}
          {typeof NotificationBell === 'undefined' && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <Icon name="bell" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'applied' && styles.activeTabButton]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'applied' && styles.activeTabButtonText]}>
            신청한 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'created' && styles.activeTabButton]}
          onPress={() => setActiveTab('created')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'created' && styles.activeTabButtonText]}>
            내가 만든 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'past' && styles.activeTabButtonText]}>
            지난 모임
          </Text>
        </TouchableOpacity>
      </View>

      {/* 컨텐츠 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT || 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
    marginHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  notificationButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  meetupsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
    paddingHorizontal: 4,
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
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UniversalMyMeetupsScreen;