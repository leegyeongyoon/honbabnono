import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../../styles/colors';
import { NotificationBell } from '../NotificationBell';
import MeetupCard from '../MeetupCard';
import EmptyState from '../EmptyState';
import userApiService, { JoinedMeetup, HostedMeetup } from '../../services/userApiService';
import { FadeIn } from '../animated';

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

  useEffect(() => {
    if (user) {
      loadMeetupData();
    }
  }, [user]);

  const handleNavigate = (screen: string, params?: any) => {
    if (onNavigate) {
      onNavigate(screen, params);
    } else if (navigation?.navigate) {
      navigation.navigate(screen, params);
    }
  };

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

  const transformMeetupData = (meetup: any) => ({
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
  });

  const loadAppliedMeetups = async () => {
    try {
      const response = await userApiService.getJoinedMeetups(1, 50);
      const { data } = response;

      if (!Array.isArray(data)) {
        setAppliedMeetups([]);
        return;
      }

      const transformedData = data.map(transformMeetupData);

      const activeMeetups = transformedData.filter(meetup =>
        !['완료', '종료', '취소', '파토'].includes(meetup.status)
      );

      setAppliedMeetups(activeMeetups);
    } catch (error) {
      setAppliedMeetups([]);
    }
  };

  const loadCreatedMeetups = async () => {
    try {
      const response = await userApiService.getHostedMeetups(1, 50);
      const { data } = response;

      if (!Array.isArray(data)) {
        setCreatedMeetups([]);
        return;
      }

      const transformedData = data.map(transformMeetupData);

      const activeMeetups = transformedData.filter(meetup =>
        !['완료', '종료', '취소', '파토'].includes(meetup.status)
      );

      setCreatedMeetups(activeMeetups);
    } catch (error) {
      setCreatedMeetups([]);
    }
  };

  const loadPastMeetups = async () => {
    try {
      const [joinedResponse, hostedResponse] = await Promise.all([
        userApiService.getJoinedMeetups(1, 50),
        userApiService.getHostedMeetups(1, 50)
      ]);

      const joinedData = Array.isArray(joinedResponse.data) ? joinedResponse.data : [];
      const hostedData = Array.isArray(hostedResponse.data) ? hostedResponse.data : [];

      const transformedJoined = joinedData.map(transformMeetupData);
      const transformedHosted = hostedData.map(transformMeetupData);

      const pastJoined = transformedJoined.filter(meetup =>
        ['완료', '종료', '취소', '파토'].includes(meetup.status)
      );
      const pastHosted = transformedHosted.filter(meetup =>
        ['완료', '종료', '취소', '파토'].includes(meetup.status)
      );

      const allPast = [...pastJoined, ...pastHosted].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setPastMeetups(allPast);
    } catch (error) {
      setPastMeetups([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetupData();
    setRefreshing(false);
  };

  const handleMeetupPress = (meetupId: string) => {
    handleNavigate('MeetupDetail', { meetupId });
  };

  const handleNotificationPress = () => {
    handleNavigate('Notification');
  };

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonTextArea}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMeta} />
            <View style={styles.skeletonMetaShort} />
          </View>
        </View>
      ))}
    </View>
  );

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
      return renderSkeletonLoader();
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
                onAction={() => handleNavigate('Home')}
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
                onAction={() => handleNavigate('CreateMeetup')}
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
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 모임</Text>
        <NotificationBell
          userId={user?.id?.toString()}
          onPress={handleNotificationPress}
          color={COLORS.text.primary}
          size={20}
        />
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'applied' && styles.activeTabButton]}
          onPress={() => setActiveTab('applied')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, activeTab === 'applied' && styles.activeTabButtonText]}>
            신청한 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'created' && styles.activeTabButton]}
          onPress={() => setActiveTab('created')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, activeTab === 'created' && styles.activeTabButtonText]}>
            내가 만든 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
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
            tintColor={COLORS.primary.main}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
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
    borderBottomColor: COLORS.neutral.grey100,
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
  // Skeleton loader styles
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  skeletonImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey100,
    marginRight: 12,
  },
  skeletonTextArea: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 16,
    width: '70%',
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonMeta: {
    height: 12,
    width: '50%',
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonMetaShort: {
    height: 12,
    width: '35%',
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey100,
  },
});

export default UniversalMyMeetupsScreen;
