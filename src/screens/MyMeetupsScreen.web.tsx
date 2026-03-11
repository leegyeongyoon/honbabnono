import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS, withOpacity } from '../styles/colors';
import { HEADER_STYLE, SPACING, BORDER_RADIUS } from '../styles/spacing';
import { NotificationBell } from '../components/NotificationBell';
import MeetupCard from '../components/MeetupCard';
import EmptyState from '../components/EmptyState';
import SummaryHero from '../components/SummaryHero';
import UnderlineTabBar from '../components/UnderlineTabBar';
import { useUserStore } from '../store/userStore';
import userApiService, { JoinedMeetup, HostedMeetup } from '../services/userApiService';
import { FadeIn } from '../components/animated';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyMeetupsScreenProps {
  user?: User | null;
}

const TAB_ITEMS = [
  { key: 'applied' as const, label: '신청한 약속' },
  { key: 'created' as const, label: '내가 만든 약속' },
  { key: 'past' as const, label: '지난 약속' },
];

// --- Date helpers ---

const DAYS_KR = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const toDateKey = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateHeader = (dateKey: string): string => {
  const d = new Date(dateKey);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = DAYS_KR[d.getDay()];
  return `${month}월 ${day}일 ${dayOfWeek}`;
};

const isToday = (dateStr: string): boolean => {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return toDateKey(dateStr) === todayKey;
};

type DateGroup<T> = {
  dateKey: string;
  label: string;
  isToday: boolean;
  meetups: T[];
};

function groupByDate<T extends { date: string }>(meetups: T[]): DateGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const m of meetups) {
    const key = toDateKey(m.date);
    const arr = map.get(key);
    if (arr) {
      arr.push(m);
    } else {
      map.set(key, [m]);
    }
  }
  const groups: DateGroup<T>[] = [];
  for (const [dateKey, items] of map.entries()) {
    groups.push({
      dateKey,
      label: formatDateHeader(dateKey),
      isToday: isToday(items[0].date),
      meetups: items,
    });
  }
  groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return groups;
}

// --- Skeleton loader (CSS-based, no Animated) ---

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <div
    key={index}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.neutral.white,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      border: `${CARD_STYLE.borderWidth}px solid ${CARD_STYLE.borderColor}`,
      boxShadow: CSS_SHADOWS.small,
    }}
  >
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginRight: 16 }}>
      <div style={{ height: 22, width: 56, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 18, width: '75%', borderRadius: 6, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.1s infinite' }} />
      <div style={{ height: 14, width: '55%', borderRadius: 4, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.2s infinite' }} />
      <div style={{ height: 14, width: '40%', borderRadius: 4, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.3s infinite' }} />
    </div>
    <div style={{ width: 64, height: 64, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.15s infinite' }} />
  </div>
);

// --- Main component ---

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

  // Inject skeleton keyframes once
  useEffect(() => {
    const styleId = 'skeleton-pulse-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `@keyframes skeleton-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }`;
      document.head.appendChild(style);
    }
  }, []);

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

  // Date-grouped data for applied and created tabs
  const appliedGroups = useMemo(() => groupByDate(appliedMeetups as any), [appliedMeetups]);
  const createdGroups = useMemo(() => groupByDate(createdMeetups as any), [createdMeetups]);

  const tabItems = TAB_ITEMS.map(tab => ({
    key: tab.key,
    label: tab.label,
    badge: getTabCount(tab.key) || undefined,
  }));

  const renderTodayBadge = () => (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 700,
        color: COLORS.primary.dark,
        backgroundColor: withOpacity(COLORS.primary.main, 0.15),
        borderRadius: BORDER_RADIUS.sm,
        padding: '2px 8px',
        marginLeft: 8,
        letterSpacing: -0.2,
      }}
    >
      오늘
    </span>
  );

  const renderDateSection = <T extends JoinedMeetup | HostedMeetup>(
    group: DateGroup<T>,
    showHostInfo: boolean,
    tabKey: string,
  ) => (
    <div key={group.dateKey} style={{ marginBottom: 4 }}>
      {/* Date section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingTop: 16,
          paddingBottom: 8,
          paddingLeft: 4,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: group.isToday ? COLORS.text.primary : COLORS.text.secondary,
            letterSpacing: -0.2,
          }}
        >
          {group.label}
        </span>
        {group.isToday && renderTodayBadge()}
      </div>

      {/* Meetup cards, with special today wrapper */}
      {group.isToday ? (
        <div
          style={{
            backgroundColor: COLORS.primary.light,
            borderRadius: BORDER_RADIUS.xl,
            padding: '12px 12px 4px 12px',
            border: `1px solid ${withOpacity(COLORS.primary.main, 0.12)}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.meetups.map((meetup, idx) =>
              renderMeetupItem(meetup, showHostInfo, `${tabKey}-${group.dateKey}-${idx}`)
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {group.meetups.map((meetup, idx) =>
            renderMeetupItem(meetup, showHostInfo, `${tabKey}-${group.dateKey}-${idx}`)
          )}
        </div>
      )}
    </div>
  );

  const renderSkeletonLoader = () => (
    <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
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
                  title="아직 신청한 약속이 없어요"
                  description="홈에서 밥약속을 찾아보세요!"
                  actionLabel="약속 찾아보기"
                  onAction={() => navigate('/')}
                />
              ) : (
                appliedGroups.map((group) =>
                  renderDateSection(group, true, 'applied')
                )
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
                  title="약속을 만들어보세요!"
                  description="새로운 밥약속을 만들어보세요!"
                  actionLabel="약속 만들기"
                  onAction={() => navigate('/create')}
                />
              ) : (
                createdGroups.map((group) =>
                  renderDateSection(group, false, 'created')
                )
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
                  title="아직 지난 약속이 없어요"
                  description="밥약속에 참여해보세요!"
                />
              ) : (
                (pastMeetups as any[]).map((meetup, index) => {
                  const meetupIsToday = isToday(meetup.date);
                  if (meetupIsToday) {
                    return (
                      <div
                        key={`past-today-${index}`}
                        style={{
                          backgroundColor: COLORS.primary.light,
                          borderRadius: BORDER_RADIUS.xl,
                          padding: 12,
                          border: `1px solid ${withOpacity(COLORS.primary.main, 0.12)}`,
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            color: COLORS.primary.dark,
                            backgroundColor: withOpacity(COLORS.primary.main, 0.15),
                            borderRadius: BORDER_RADIUS.sm,
                            padding: '2px 8px',
                            letterSpacing: -0.2,
                            zIndex: 1,
                          }}
                        >
                          오늘
                        </span>
                        {renderMeetupItem(meetup, !('hostName' in meetup), `past-${index}`)}
                      </div>
                    );
                  }
                  return renderMeetupItem(meetup, !('hostName' in meetup), `past-${index}`);
                })
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
        <Text style={styles.headerTitle}>내 약속</Text>
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

      {/* 언더라인 탭바 */}
      <UnderlineTabBar
        tabs={tabItems}
        activeKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'applied' | 'created' | 'past')}
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
      >
        {/* Summary Hero */}
        <SummaryHero
          items={[
            { label: '신청한', value: appliedMeetups.length, color: COLORS.primary.main },
            { label: '만든', value: createdMeetups.length, color: COLORS.functional.info },
            { label: '지난', value: pastMeetups.length, color: COLORS.text.tertiary },
          ]}
        />

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
    paddingHorizontal: SPACING.screen.horizontal,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: CSS_SHADOWS.stickyHeader,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  meetupsContainer: {
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: SPACING.lg,
    gap: 14,
  },
});

export default MyMeetupsScreen;
