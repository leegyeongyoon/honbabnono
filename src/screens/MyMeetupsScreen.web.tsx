import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, CSS_SHADOWS } from '../styles/colors';
import { SPACING } from '../styles/spacing';
import { NotificationBell } from '../components/NotificationBell';
import MeetupCard from '../components/MeetupCard';
import EmptyState from '../components/EmptyState';
import { Icon } from '../components/Icon';
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

type TabKey = 'applied' | 'created' | 'past';

const TAB_ITEMS: { key: TabKey; label: string; placeholder: string }[] = [
  { key: 'applied', label: '신청한 모임', placeholder: '신청한 모임을 찾아봐요' },
  { key: 'created', label: '내가 만든 모임', placeholder: '내가 만든 모임을 찾아봐요' },
  { key: 'past', label: '지난 모임', placeholder: '지난 모임을 찾아봐요' },
];

// --- Skeleton loader (Figma home/list pattern) ---

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <div
    key={index}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '16px 20px',
      backgroundColor: COLORS.neutral.white,
    }}
  >
    <div
      style={{
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: COLORS.neutral.grey100,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 18, width: '55%', borderRadius: 4, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.1s infinite' }} />
      <div style={{ height: 14, width: '80%', borderRadius: 4, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.2s infinite' }} />
      <div style={{ height: 12, width: '45%', borderRadius: 4, backgroundColor: COLORS.neutral.grey100, animation: 'skeleton-pulse 1.5s ease-in-out 0.3s infinite' }} />
    </div>
  </div>
);

// --- Main component ---

const MyMeetupsScreen: React.FC<MyMeetupsScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabKey>('applied');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Reset search when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

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

  const transformMeetup = (meetup: any) => ({
    ...meetup,
    maxParticipants: meetup.max_participants || meetup.maxParticipants,
    currentParticipants: meetup.current_participants || meetup.currentParticipants,
    priceRange: meetup.price_range || meetup.priceRange,
    ageRange: meetup.age_range || meetup.ageRange,
    genderPreference: meetup.gender_preference || meetup.genderPreference,
    diningPreferences: meetup.dining_preferences || meetup.diningPreferences || {},
    promiseDepositAmount: meetup.promise_deposit_amount || meetup.promiseDepositAmount || 0,
    promiseDepositRequired: meetup.promise_deposit_required || meetup.promiseDepositRequired || false,
    createdAt: meetup.created_at || meetup.createdAt,
  });

  const loadAppliedMeetups = async () => {
    try {
      const response = await userApiService.getJoinedMeetups(1, 50);
      const { data } = response;

      if (!Array.isArray(data)) {
        setAppliedMeetups([]);
        return;
      }

      const transformedData = data.map(transformMeetup);

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
      const transformedData = data.map(transformMeetup);
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

      const isPast = (m: any) =>
        m.status === '완료' || m.status === '종료' || m.status === '취소' || m.status === '파토';

      const pastJoined = joinedResponse.data.map(transformMeetup).filter(isPast);
      const pastHosted = hostedResponse.data.map(transformMeetup).filter(isPast);

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

  // Current tab's data + search filter
  const currentMeetups = useMemo(() => {
    const list =
      activeTab === 'applied' ? appliedMeetups :
      activeTab === 'created' ? createdMeetups :
      pastMeetups;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((m: any) =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q)
    );
  }, [activeTab, appliedMeetups, createdMeetups, pastMeetups, searchQuery]);

  const activeTabMeta = TAB_ITEMS.find(t => t.key === activeTab)!;

  const renderSkeletonLoader = () => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );

  const renderEmptyState = () => {
    switch (activeTab) {
      case 'applied':
        return (
          <EmptyState
            icon="calendar"
            title="아직 신청한 모임이 없어요"
            description="홈에서 모임을 찾아보세요!"
            actionLabel="모임 찾아보기"
            onAction={() => navigate('/')}
          />
        );
      case 'created':
        return (
          <EmptyState
            icon="plus-circle"
            title="모임을 만들어보세요!"
            description="새로운 모임을 만들어보세요!"
            actionLabel="모임 만들기"
            onAction={() => navigate('/create')}
          />
        );
      case 'past':
        return (
          <EmptyState
            icon="clock"
            title="아직 지난 모임이 없어요"
            description="모임에 참여해보세요!"
          />
        );
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return renderSkeletonLoader();
    }

    if (currentMeetups.length === 0) {
      if (searchQuery.trim()) {
        return (
          <EmptyState
            icon="search"
            title="검색 결과가 없어요"
            description={`"${searchQuery}"에 대한 모임을 찾을 수 없어요`}
          />
        );
      }
      return renderEmptyState();
    }

    return (
      <FadeIn>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {currentMeetups.map((meetup: any, idx: number) => (
            <MeetupCard
              key={`${activeTab}-${meetup.id}-${idx}`}
              meetup={meetup}
              onPress={handleMeetupPress}
              variant="compact"
            />
          ))}
        </div>
      </FadeIn>
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 — Figma pattern */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 약속</Text>
        <View style={styles.headerIcons}>
          <NotificationBell
            userId={user?.id?.toString()}
            onPress={() => navigate('/notifications')}
            color={COLORS.text.primary}
            size={22}
            // @ts-ignore web-specific
            aria-label="알림"
          />
        </View>
      </View>

      {/* 탭바 — Figma simple underline (3 tabs equal width) */}
      <div style={styles_web.tabBar as React.CSSProperties}>
        {TAB_ITEMS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles_web.tabButton,
                color: isActive ? '#121212' : '#666',
                borderBottom: isActive ? '2px solid #121212' : '2px solid transparent',
              }}
              aria-label={tab.label}
              aria-selected={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 검색창 — Figma pattern */}
      <div style={styles_web.searchWrap as React.CSSProperties}>
        <div style={styles_web.searchBox as React.CSSProperties}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTabMeta.placeholder}
            style={styles_web.searchInput as React.CSSProperties}
            aria-label={`${activeTabMeta.label} 검색`}
          />
          <Icon name="search" size={20} color="#7e8082" />
        </div>
      </div>

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

      {/* FAB — Figma 추가 버튼 */}
      <button
        onClick={() => navigate('/create')}
        style={styles_web.fab as React.CSSProperties}
        aria-label="모임 만들기"
      >
        <Icon name="plus" size={28} color="#fff" />
      </button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.screen.horizontal,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#121212',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
});

// Web-only CSS-in-JS styles (Figma pattern)
const styles_web = {
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #f1f2f3',
    backgroundColor: '#fff',
  } as React.CSSProperties,
  tabButton: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 14,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: -0.3,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'color 150ms ease',
  },
  searchWrap: {
    padding: '12px 20px 10px',
    backgroundColor: '#fff',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f1f2f3',
    borderRadius: 12,
    padding: '0 18px',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: -0.3,
    color: '#121212',
    fontFamily: 'inherit',
  },
  fab: {
    position: 'fixed',
    bottom: 103,
    right: 16,
    width: 57,
    height: 57,
    borderRadius: 28.5,
    background: `linear-gradient(135deg, ${COLORS.primary.main}, ${COLORS.primary.dark})`,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(255,165,41,0.35), 0 2px 6px rgba(0,0,0,0.08)',
    transition: 'transform 150ms ease, box-shadow 150ms ease',
    zIndex: 20,
  },
};

export default MyMeetupsScreen;
