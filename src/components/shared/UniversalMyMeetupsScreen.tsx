import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SHADOWS, CARD_STYLE } from '../../styles/colors';
import { NotificationBell } from '../NotificationBell';
import UnderlineTabBar from '../UnderlineTabBar';
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

type TabKey = 'applied' | 'created' | 'past';

interface DateGroup {
  date: string;
  label: string;
  meetups: (JoinedMeetup | HostedMeetup)[];
}

const groupByDate = (meetupList: (JoinedMeetup | HostedMeetup)[]): DateGroup[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateMap = new Map<string, (JoinedMeetup | HostedMeetup)[]>();

  meetupList.forEach(meetup => {
    const meetupDate = new Date(meetup.date);
    meetupDate.setHours(0, 0, 0, 0);
    const key = meetupDate.toISOString().split('T')[0];
    if (!dateMap.has(key)) {
      dateMap.set(key, []);
    }
    dateMap.get(key)!.push(meetup);
  });

  const sortedKeys = [...dateMap.keys()].sort();

  return sortedKeys.map(key => {
    const date = new Date(key);
    let label = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    if (date.getTime() === today.getTime()) label = '오늘';
    else if (date.getTime() === tomorrow.getTime()) label = '내일';

    return {
      date: key,
      label,
      meetups: dateMap.get(key)!,
    };
  });
};

const SkeletonPulse: React.FC<{ style?: any }> = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={[style, { opacity: pulseAnim }]} />;
};

const UniversalMyMeetupsScreen: React.FC<UniversalMyMeetupsScreenProps> = ({
  navigation,
  user,
  onNavigate,
  onGoBack
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('applied');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedMeetups, setAppliedMeetups] = useState<JoinedMeetup[]>([]);
  const [createdMeetups, setCreatedMeetups] = useState<HostedMeetup[]>([]);
  const [pastMeetups, setPastMeetups] = useState<(JoinedMeetup | HostedMeetup)[]>([]);

  const appliedCount = appliedMeetups.length;
  const createdCount = createdMeetups.length;
  const pastCount = pastMeetups.length;

  const tabItems = useMemo(() => [
    { key: 'applied', label: '신청한 약속', badge: appliedCount },
    { key: 'created', label: '내가 만든 약속', badge: createdCount },
    { key: 'past', label: '지난 약속', badge: pastCount },
  ], [appliedCount, createdCount, pastCount]);

  const currentMeetups = useMemo(() => {
    switch (activeTab) {
      case 'applied': return appliedMeetups;
      case 'created': return createdMeetups;
      case 'past': return pastMeetups;
      default: return [];
    }
  }, [activeTab, appliedMeetups, createdMeetups, pastMeetups]);

  const dateGroups = useMemo(() => groupByDate(currentMeetups), [currentMeetups]);

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
          <View style={styles.skeletonLeft}>
            <SkeletonPulse style={styles.skeletonBadge} />
            <SkeletonPulse style={styles.skeletonTitle} />
            <SkeletonPulse style={styles.skeletonMeta} />
            <SkeletonPulse style={styles.skeletonMetaShort} />
          </View>
          <SkeletonPulse style={styles.skeletonImage} />
        </View>
      ))}
    </View>
  );

  const getEmptyState = () => {
    switch (activeTab) {
      case 'applied':
        return (
          <EmptyState
            icon="calendar"
            title="아직 신청한 약속이 없어요"
            description="홈에서 밥약속을 찾아보세요!"
            actionLabel="약속 찾아보기"
            onAction={() => handleNavigate('Home')}
          />
        );
      case 'created':
        return (
          <EmptyState
            icon="plus-circle"
            title="약속을 만들어보세요!"
            description="새로운 밥약속을 만들어보세요!"
            actionLabel="약속 만들기"
            onAction={() => handleNavigate('CreateMeetup')}
          />
        );
      case 'past':
        return (
          <EmptyState
            icon="clock"
            title="아직 지난 약속이 없어요"
            description="밥약속에 참여해보세요!"
          />
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return renderSkeletonLoader();
    }

    if (currentMeetups.length === 0) {
      return (
        <FadeIn>
          <View style={styles.meetupsContainer}>
            {getEmptyState()}
          </View>
        </FadeIn>
      );
    }

    return (
      <FadeIn>
        <View style={styles.meetupsContainer}>
          {dateGroups.map(group => (
            <View key={group.date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{group.label}</Text>
                {group.label === '오늘' && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>TODAY</Text>
                  </View>
                )}
              </View>
              {group.meetups.map((meetup, index) => (
                <MeetupCard
                  key={`${activeTab}-${group.date}-${meetup.id}-${index}`}
                  meetup={meetup}
                  onPress={handleMeetupPress}
                  variant="compact"
                />
              ))}
            </View>
          ))}
        </View>
      </FadeIn>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary Hero */}
      <View style={styles.summaryHero}>
        <LinearGradient
          colors={['#FFF8F0', '#FFFFFF']}
          style={styles.summaryGradient}
        >
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryTitle}>내 약속</Text>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={handleNotificationPress}
              color={COLORS.text.primary}
              size={22}
              accessibilityLabel="알림"
            />
          </View>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{appliedCount}</Text>
              <Text style={styles.summaryStatLabel}>신청</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{createdCount}</Text>
              <Text style={styles.summaryStatLabel}>주최</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{pastCount}</Text>
              <Text style={styles.summaryStatLabel}>완료</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* UnderlineTabBar */}
      <UnderlineTabBar
        tabs={tabItems}
        activeKey={activeTab}
        onTabChange={(key) => setActiveTab(key as TabKey)}
      />

      {/* 컨텐츠 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
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
  // Summary Hero
  summaryHero: {
    marginBottom: 0,
  },
  summaryGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.neutral.grey100,
  },
  // Date Groups
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  todayBadge: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  meetupsContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 10,
  },
  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 10,
    padding: 16,
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
  },
  skeletonLeft: {
    flex: 1,
    gap: 10,
    marginRight: 16,
  },
  skeletonBadge: {
    height: 22,
    width: 56,
    borderRadius: 9999,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonTitle: {
    height: 18,
    width: '75%',
    borderRadius: 6,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonMeta: {
    height: 14,
    width: '55%',
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonMetaShort: {
    height: 14,
    width: '40%',
    borderRadius: 4,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey100,
  },
});

export default UniversalMyMeetupsScreen;
