import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { Icon } from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import MeetupCard from '../components/MeetupCard';
import EmptyState from '../components/EmptyState';
import { useUserStore } from '../store/userStore';
import userApiService, { JoinedMeetup, HostedMeetup } from '../services/userApiService';
import { formatKoreanDateTime } from '../utils/dateUtils';
import { FadeIn } from '../components/animated';

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

  useEffect(() => {
    if (user) {
      loadMeetupData();
    }
  }, [user]);

  const loadMeetupData = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        loadAppliedMeetups(),
        loadCreatedMeetups(),
        loadPastMeetups()
      ]);
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadAppliedMeetups = async () => {
    try {
      const response = await userApiService.getJoinedMeetups(1, 50);
      const { data } = response;

      if (!Array.isArray(data)) {
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

      // 현재 진행중인 모임만 필터링
      const activeMeetups = transformedData.filter(meetup => {
        return meetup.status === '모집중' || meetup.status === '예정';
      });

      setAppliedMeetups(activeMeetups);
    } catch (error) {
      // silently fail
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
      // silently fail
    }
  };

  const loadPastMeetups = async () => {
    try {
      const [joinedResponse, hostedResponse] = await Promise.all([
        userApiService.getJoinedMeetups(1, 50),
        userApiService.getHostedMeetups(1, 50)
      ]);

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
        return meetup.status === '완료' || meetup.status === '종료' ||
               meetup.status === '취소' || meetup.status === '파토';
      });
      const pastHosted = transformedHosted.filter(meetup => {
        return meetup.status === '완료' || meetup.status === '종료' ||
               meetup.status === '취소' || meetup.status === '파토';
      });

      // 두 배열을 합치고 날짜순으로 정렬
      const allPast = [...pastJoined, ...pastHosted].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setPastMeetups(allPast);
    } catch (error) {
      // silently fail
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetupData();
    setRefreshing(false);
  };

  const handleMeetupPress = (meetupOrId: any) => {
    const meetupId = typeof meetupOrId === 'string' ? meetupOrId : meetupOrId?.id;
    if (meetupId) {
      navigate(`/meetup/${meetupId}`);
    }
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
      case '완료': return '정상 완료';
      case '종료': return '정상 완료';
      case '취소': return '취소됨';
      case '파토': return '파토됨';
      case '예정': return '예정';
      case '모집중': return '모집중';
      case '모집완료': return '모집완료';
      case '진행중': return '진행중';
      default: return status;
    }
  };

  const renderMeetupItem = (meetup: JoinedMeetup | HostedMeetup, showHostInfo: boolean = false, keyPrefix?: string) => (
    <MeetupCard
      key={keyPrefix ? `${keyPrefix}-${meetup.id}` : meetup.id}
      meetup={meetup}
      onPress={handleMeetupPress}
      variant="compact"
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
          <FadeIn>
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>신청한 모임 ({appliedMeetups.length}개)</Text>
            {appliedMeetups.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="신청한 모임이 없습니다"
                description="홈에서 모임을 찾아보세요!"
                actionLabel="모임 찾아보기"
                onAction={() => navigate('/')}
              />
            ) : (
              appliedMeetups.map((meetup, index) => renderMeetupItem(meetup, true, `applied-${index}`))
            )}
          </View>
          </FadeIn>
        );

      case 'created':
        return (
          <FadeIn>
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>만든 모임 ({createdMeetups.length}개)</Text>
            {createdMeetups.length === 0 ? (
              <EmptyState
                icon="plus-circle"
                title="만든 모임이 없습니다"
                description="새로운 모임을 만들어보세요!"
                actionLabel="모임 만들기"
                onAction={() => navigate('/create')}
              />
            ) : (
              createdMeetups.map((meetup, index) => renderMeetupItem(meetup, false, `created-${index}`))
            )}
          </View>
          </FadeIn>
        );

      case 'past':
        return (
          <FadeIn>
          <View style={styles.meetupsContainer}>
            <Text style={styles.sectionTitle}>지난 모임 ({pastMeetups.length}개)</Text>
            {pastMeetups.length === 0 ? (
              <EmptyState
                icon="clock"
                title="지난 모임이 없습니다"
                description="모임에 참여해보세요!"
              />
            ) : (
              pastMeetups.map((meetup, index) => renderMeetupItem(meetup, !('hostName' in meetup), `past-${index}`))
            )}
          </View>
          </FadeIn>
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
        <NotificationBell
          userId={user?.id?.toString()}
          onPress={() => {
            navigate('/notifications');
          }}
          color={COLORS.text.primary}
          size={20}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  meetupsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    borderBottomColor: 'rgba(0,0,0,0.06)',
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