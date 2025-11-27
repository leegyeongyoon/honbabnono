import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import MeetupCard from '../components/MeetupCard';
import { useUserStore } from '../store/userStore';
import userApiService, { JoinedMeetup, HostedMeetup } from '../services/userApiService';
import { formatKoreanDateTime } from '../utils/dateUtils';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyMeetupsScreenProps {
  user?: User | null;
}

const MyMeetupsScreen: React.FC<MyMeetupsScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser } = useUserStore();
  const [activeTab, setActiveTab] = useState<'applied' | 'created' | 'past'>('applied');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedMeetups, setAppliedMeetups] = useState<JoinedMeetup[]>([]);
  const [createdMeetups, setCreatedMeetups] = useState<HostedMeetup[]>([]);
  const [pastMeetups, setPastMeetups] = useState<(JoinedMeetup | HostedMeetup)[]>([]);

  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;
  console.log('🔍 [MyMeetups] User 상태:', { propsUser, storeUser, finalUser: user });

  useEffect(() => {
    console.log('🔍 [MyMeetups] useEffect 실행됨, user:', user);
    if (user) {
      loadMeetupData();
    }
  }, [user]); // user가 변경될 때마다 실행

  console.log('🔍 [MyMeetups] 컴포넌트 렌더링됨, user:', user, 'activeTab:', activeTab);

  const loadMeetupData = async () => {
    console.log('🔍 [MyMeetups] loadMeetupData 시작, user:', user);
    if (!user) {
      console.log('❌ [MyMeetups] user가 없어서 종료');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 [MyMeetups] 데이터 로딩 시작, Promise.all 실행');
      await Promise.all([
        loadAppliedMeetups(),
        loadCreatedMeetups(),
        loadPastMeetups()
      ]);
      console.log('🔍 [MyMeetups] 모든 데이터 로딩 완료');
    } catch (error) {
      console.error('❌ [MyMeetups] 모임 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppliedMeetups = async () => {
    try {
      console.log('🔍 [MyMeetups] 신청한 모임 로드 시작...');
      const response = await userApiService.getJoinedMeetups(1, 50);
      console.log('🔍 [MyMeetups] API 전체 응답:', response);
      const { data } = response;
      console.log('🔍 [MyMeetups] 응답 데이터:', data, '타입:', typeof data, '배열여부:', Array.isArray(data));
      
      if (!Array.isArray(data)) {
        console.error('❌ [MyMeetups] 데이터가 배열이 아님:', data);
        setAppliedMeetups([]);
        return;
      }
      
      // 백엔드에서 받은 snake_case를 camelCase로 변환
      const transformedData = data.map(meetup => {
        const transformed = {
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
        };
        console.log('🔍 [MyMeetups] 원본 데이터:', {
          title: meetup.title,
          price_range: meetup.price_range,
          age_range: meetup.age_range,
          gender_preference: meetup.gender_preference,
          dining_preferences: meetup.dining_preferences,
          promise_deposit_amount: meetup.promise_deposit_amount
        });
        console.log('🔍 [MyMeetups] 변환 후 데이터:', {
          title: transformed.title,
          priceRange: transformed.priceRange,
          ageRange: transformed.ageRange,
          genderPreference: transformed.genderPreference,
          diningPreferences: transformed.diningPreferences,
          promiseDepositAmount: transformed.promiseDepositAmount
        });
        return transformed;
      });
      
      console.log('🔍 [MyMeetups] 각 모임 데이터 확인:');
      transformedData.forEach((meetup, index) => {
        console.log(`  ${index + 1}. ${meetup.title} - 상태: "${meetup.status}"`);
      });
      
      // 현재 진행중인 모임만 필터링
      const activeMeetups = transformedData.filter(meetup => {
        const isActive = meetup.status === '모집중' || meetup.status === '예정';
        console.log(`🔍 [MyMeetups] "${meetup.title}" 필터링: ${meetup.status} -> ${isActive}`);
        return isActive;
      });
      
      console.log('🔍 [MyMeetups] 필터링된 결과:', activeMeetups.length, '개');
      setAppliedMeetups(activeMeetups);
    } catch (error) {
      console.error('❌ 신청한 모임 로드 실패:', error);
    }
  };

  const loadCreatedMeetups = async () => {
    try {
      const { data } = await userApiService.getHostedMeetups(1, 50);
      
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
      
      // 현재 진행중인 모임만 필터링
      const activeMeetups = transformedData.filter(meetup => 
        meetup.status === '모집중' || meetup.status === '예정'
      );
      setCreatedMeetups(activeMeetups);
    } catch (error) {
      console.error('만든 모임 로드 실패:', error);
    }
  };

  const loadPastMeetups = async () => {
    try {
      console.log('🔍 [MyMeetups] 지난 모임 로드 시작...');
      const [joinedResponse, hostedResponse] = await Promise.all([
        userApiService.getJoinedMeetups(1, 50),
        userApiService.getHostedMeetups(1, 50)
      ]);
      
      console.log('🔍 [MyMeetups] 참가 모임 응답:', joinedResponse);
      console.log('🔍 [MyMeetups] 호스팅 모임 응답:', hostedResponse);
      
      // 백엔드에서 받은 snake_case를 camelCase로 변환
      const transformedJoined = joinedResponse.data.map(meetup => ({
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
      
      const transformedHosted = hostedResponse.data.map(meetup => ({
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
      const pastJoined = transformedJoined.filter(meetup => {
        const isPast = meetup.status === '완료' || meetup.status === '종료' || 
                       meetup.status === '취소' || meetup.status === '파토';
        console.log(`🔍 [MyMeetups] 참가모임 "${meetup.title}" 상태: "${meetup.status}" -> isPast: ${isPast}`);
        return isPast;
      });
      const pastHosted = transformedHosted.filter(meetup => {
        const isPast = meetup.status === '완료' || meetup.status === '종료' || 
                       meetup.status === '취소' || meetup.status === '파토';
        console.log(`🔍 [MyMeetups] 호스팅모임 "${meetup.title}" 상태: "${meetup.status}" -> isPast: ${isPast}`);
        return isPast;
      });
      
      console.log('🔍 [MyMeetups] 필터링된 참가 지난 모임:', pastJoined.length, '개');
      console.log('🔍 [MyMeetups] 필터링된 호스팅 지난 모임:', pastHosted.length, '개');
      
      // 두 배열을 합치고 날짜순으로 정렬
      const allPast = [...pastJoined, ...pastHosted].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      console.log('🔍 [MyMeetups] 전체 지난 모임:', allPast.length, '개');
      setPastMeetups(allPast);
    } catch (error) {
      console.error('지난 모임 로드 실패:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetupData();
    setRefreshing(false);
  };

  const handleMeetupPress = (meetupId: string) => {
    navigate(`/meetup/${meetupId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.functional.success;
      case '종료': return COLORS.functional.success;
      case '취소': return COLORS.text.error;
      case '파토': return COLORS.text.error;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      case '모집완료': return COLORS.primary.main;
      case '진행중': return COLORS.secondary.main;
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
                <Text style={styles.emptyText}>신청한 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>홈에서 모임을 찾아보세요!</Text>
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
                <Text style={styles.emptyText}>만든 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>새로운 모임을 만들어보세요!</Text>
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
                <Text style={styles.emptyText}>지난 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>모임에 참여해보세요!</Text>
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
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 모임</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
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
  meetupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  meetupInfo: {
    flex: 1,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  meetupCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  meetupLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  meetupRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  participantInfo: {
    fontSize: 11,
    color: COLORS.text.secondary,
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
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});

export default MyMeetupsScreen;