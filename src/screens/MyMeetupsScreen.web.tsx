import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE, TRANSITIONS, withOpacity } from '../styles/colors';
import { NotificationBell } from '../components/NotificationBell';
import MeetupCard from '../components/MeetupCard';
import EmptyState from '../components/EmptyState';
import { useUserStore } from '../store/userStore';
import userApiService, { JoinedMeetup, HostedMeetup } from '../services/userApiService';
import { FadeIn } from '../components/animated';

// Web hover wrapper for tab buttons
const WebTabButton: React.FC<{
  isActive: boolean;
  onPress: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}> = ({ isActive, onPress, children, ariaLabel }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <TouchableOpacity
      // @ts-ignore web-specific props
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.tabButton,
        isActive && styles.activeTabButton,
        // @ts-ignore web-specific style
        {
          transition: `all ${TRANSITIONS.normal}`,
          cursor: 'pointer',
          backgroundColor: hovered && !isActive ? withOpacity(COLORS.neutral.grey100, 0.25) : 'transparent',
        },
      ]}
      onPress={onPress}
      // @ts-ignore web-specific
      aria-label={ariaLabel}
      accessibilityRole="tab"
    >
      {children}
    </TouchableOpacity>
  );
};

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyMeetupsScreenProps {
  user?: User | null;
}

const TAB_ITEMS = [
  { key: 'applied' as const, label: '신청한 모임' },
  { key: 'created' as const, label: '내가 만든 모임' },
  { key: 'past' as const, label: '지난 모임' },
];

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

  const renderMeetupItem = (meetup: JoinedMeetup | HostedMeetup, showHostInfo: boolean = false, keyPrefix?: string) => (
    <MeetupCard
      key={keyPrefix ? `${keyPrefix}-${meetup.id}` : meetup.id}
      meetup={meetup}
      onPress={handleMeetupPress}
      variant="compact"
    />
  );

  const getTabCount = (tab: 'applied' | 'created' | 'past') => {
    switch (tab) {
      case 'applied': return appliedMeetups.length;
      case 'created': return createdMeetups.length;
      case 'past': return pastMeetups.length;
    }
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

  const renderTabContent = () => {
    if (loading) {
      return renderSkeletonLoader();
    }

    switch (activeTab) {
      case 'applied':
        return (
          <FadeIn>
          <View style={styles.meetupsContainer}>
            {appliedMeetups.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="아직 신청한 모임이 없어요"
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
            {createdMeetups.length === 0 ? (
              <EmptyState
                icon="plus-circle"
                title="모임을 만들어보세요!"
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
            {pastMeetups.length === 0 ? (
              <EmptyState
                icon="clock"
                title="아직 지난 모임이 없어요"
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
          size={22}
          // @ts-ignore web-specific
          aria-label="알림"
        />
      </View>

      {/* 탭 바 */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key);
          return (
            <WebTabButton
              key={tab.key}
              isActive={isActive}
              onPress={() => setActiveTab(tab.key)}
              ariaLabel={`${tab.label} ${count > 0 ? `${count}개` : ''}`}
            >
              {/* @ts-ignore web-specific style */}
              <Text style={[styles.tabButtonText, isActive && styles.activeTabButtonText, { transition: `color ${TRANSITIONS.normal}` }]}>
                {tab.label}
              </Text>
              {count > 0 && (
                // @ts-ignore web-specific style
                <View style={[styles.tabCountBadge, isActive && styles.activeTabCountBadge, { transition: `all ${TRANSITIONS.normal}` }]}>
                  <Text style={[styles.tabCountText, isActive && styles.activeTabCountText]}>
                    {count}
                  </Text>
                </View>
              )}
            </WebTabButton>
          );
        })}
      </View>

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
  // Header
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
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(224,146,110,0.08)',
    paddingHorizontal: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  tabCountBadge: {
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeTabCountBadge: {
    backgroundColor: COLORS.primary.dark,
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  activeTabCountText: {
    color: COLORS.text.white,
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
    paddingTop: 16,
    gap: 14,
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
    borderRadius: 8,
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

export default MyMeetupsScreen;
