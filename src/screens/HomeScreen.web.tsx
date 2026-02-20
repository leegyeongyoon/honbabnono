import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT, CSS_SHADOWS } from '../styles/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import CreateMeetupWizard from './CreateMeetupWizard.web';
import NeighborhoodSelector from '../components/NeighborhoodSelector';
import MeetupCard from '../components/MeetupCard';
import CategoryIcon from '../components/CategoryIcon';
import FadeIn from '../components/animated/FadeIn';
import MeetupCardSkeleton from '../components/skeleton/MeetupCardSkeleton';
import locationService from '../services/locationService';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import { FOOD_CATEGORIES } from '../constants/categories';
import AdvertisementBanner from '../components/AdvertisementBanner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useMeetups } from '../hooks/useMeetups';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

// 시간대별 인사말
const getGreeting = (): { greeting: string; subtitle: string } => {
  const hour = new Date().getHours();
  if (hour < 7) return { greeting: '좋은 새벽이에요!', subtitle: '일찍 일어나셨네요' };
  if (hour < 11) return { greeting: '좋은 아침이에요!', subtitle: '오늘도 맛있는 하루 시작해요' };
  if (hour < 14) return { greeting: '점심 시간이에요!', subtitle: '함께 맛있는 점심 어때요?' };
  if (hour < 17) return { greeting: '좋은 오후에요!', subtitle: '간식 타임 같이 할까요?' };
  if (hour < 21) return { greeting: '저녁이 왔어요!', subtitle: '오늘 같이 밥 먹을까요?' };
  return { greeting: '좋은 밤이에요!', subtitle: '야식 메이트를 찾아볼까요?' };
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, navigation, user: propUser }) => {
  const navigate = useNavigate();
  const { updateNeighborhood, user } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
  const { searchMeetups, meetups: searchResults, loading: searchLoading } = useMeetups();
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const [fabPressed, setFabPressed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [hoveredSeeAll, setHoveredSeeAll] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoveredAllMeetups, setHoveredAllMeetups] = useState(false);

  const handleMeetupClick = useCallback((meetup: any) => {
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    navigate(`/meetup/${meetupId}`);
  }, [navigate]);

  useEffect(() => {
    loadSavedNeighborhood();
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const loadSavedNeighborhood = () => {
    const saved = locationService.getUserNeighborhood();
    if (saved) {
      setCurrentNeighborhood(saved);
    } else {
      setCurrentNeighborhood({ district: '강남구', neighborhood: '역삼동' });
    }
  };

  const handleNeighborhoodSelect = (district: string, neighborhood: string) => {
    const newNeighborhood = { district, neighborhood };
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}&autoSearch=true`);
    }
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    setShowSearchSuggestions(text.length > 0);
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.nativeEvent?.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const searchSuggestions = [
    '우울할때 갈만한 밥약속 추천해줘',
    '스트레스 받을 때 좋은 곳',
    '혼자 갈 수 있는 카페',
    '맛있는 한식 밥약속',
    '저렴한 술집 약속',
    '새로운 사람들과 친해지기',
  ];

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    setTimeout(() => {
      handleSearchSubmit();
    }, 100);
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  };

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(offsetY > 400);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // ─── 섹션별 모임 데이터 분류 ─────────────────────────────
  const now = new Date();

  const soonMeetups = meetups
    .filter((m) => {
      if (!m.date) return false;
      const meetupDate = new Date(m.date);
      const diffMs = meetupDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > -2 && diffHours < 48 && m.status === 'recruiting';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const newMeetups = [...meetups]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt).getTime();
      return bTime - aTime;
    })
    .slice(0, 6);

  const recruitingMeetups = meetups
    .filter((m) => m.status === 'recruiting')
    .slice(0, 10);

  const { greeting, subtitle } = getGreeting();

  // ─── 섹션 헤더 컴포넌트 (에디토리얼 — 클린 타이포그래피) ────
  const SectionHeader = ({ title, subtitle: sub, onSeeAll, seeAllKey }: {
    emoji?: string; title: string; subtitle?: string; onSeeAll: () => void; seeAllKey: string;
  }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `0 ${SPACING.xl}px`,
      marginBottom: SPACING.md,
    }}>
      <div>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 3,
            height: 18,
            backgroundColor: COLORS.primary.accent,
            borderRadius: 2,
          }} />
          <div style={{
            fontSize: 18,
            fontWeight: '700',
            lineHeight: '26px',
            letterSpacing: -0.3,
            color: COLORS.text.primary,
          }}>
            {title}
          </div>
        </div>
        {sub && (
          <div style={{
            fontSize: 13,
            fontWeight: '400',
            lineHeight: '18px',
            color: COLORS.text.tertiary,
            marginTop: 4,
            marginLeft: 13,
          }}>
            {sub}
          </div>
        )}
      </div>
      <div
        onClick={onSeeAll}
        onMouseEnter={() => setHoveredSeeAll(seeAllKey)}
        onMouseLeave={() => setHoveredSeeAll(null)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minHeight: 44,
          paddingLeft: 8,
        }}
        role="link"
        aria-label={`${title} 더보기`}
      >
        <span style={{
          fontSize: 13,
          fontWeight: '500',
          color: hoveredSeeAll === seeAllKey ? COLORS.primary.accent : COLORS.text.tertiary,
          transition: 'color 150ms ease',
        }}>더보기</span>
        <Icon name="chevron-right" size={14} color={hoveredSeeAll === seeAllKey ? COLORS.primary.accent : COLORS.text.tertiary} />
      </div>
    </div>
  );

  return (
    <View style={styles.container}>
      {/* 고정 헤더 — 미니멀 에디토리얼 */}
      <div style={{
        boxShadow: CSS_SHADOWS.stickyHeader,
        zIndex: 10,
        position: 'relative',
        borderBottom: `1px solid rgba(17,17,17,0.06)`,
      }}>
        <View style={styles.header}>
          <View style={styles.headerLogoWrap}>
            <Image
              source={require('../assets/logo/logo-v2-table-e.png')}
              style={styles.headerLogoImage}
            />
            <Text style={styles.headerLogo}>잇테이블</Text>
          </View>

          <TouchableOpacity
            style={[styles.locationButton, { cursor: 'pointer' } as any]}
            onPress={openNeighborhoodSelector}
            accessibilityLabel="동네 변경"
          >
            <Icon name="map-pin" size={14} color={COLORS.primary.accent} />
            <Text style={styles.locationText}>
              {currentNeighborhood ? `${currentNeighborhood.neighborhood}` : '역삼동'}
            </Text>
            <Icon name="chevron-down" size={14} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={() => {
                if (navigation?.navigateToNotifications) {
                  navigation.navigateToNotifications();
                } else if (navigation?.navigate) {
                  navigation.navigate('Notifications');
                }
              }}
              color={COLORS.text.primary}
              size={22}
            />
          </View>
        </View>
      </div>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* ─── 히어로 섹션 — 딥 차콜 그라데이션 ─── */}
        <div
          className="animate-fadeIn"
          style={{
            background: COLORS.gradient.heroCSS,
            paddingTop: 40,
            paddingBottom: 48,
            paddingLeft: 24,
            paddingRight: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 장식 — 미니멀 기하학적 요소 */}
          <div style={{
            position: 'absolute',
            top: -30,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: 70,
            background: 'radial-gradient(circle, rgba(196,154,112,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -20,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: 50,
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* 인사 텍스트 */}
          <div style={{ marginBottom: 6 }}>
            <div style={{
              fontSize: 28,
              fontWeight: '700',
              lineHeight: '36px',
              letterSpacing: -0.5,
              color: '#FFFFFF',
            }}>
              {greeting}
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: '400',
              lineHeight: '22px',
              color: 'rgba(255,255,255,0.7)',
              marginTop: 6,
            }}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* 검색바 (히어로 아래 겹쳐서 배치) */}
        <div style={{
          padding: `0 ${SPACING.xl}px`,
          marginTop: -24,
          marginBottom: SPACING.lg,
          position: 'relative',
          zIndex: 5,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 48,
            backgroundColor: COLORS.neutral.white,
            borderRadius: BORDER_RADIUS.lg,
            paddingLeft: SPACING.lg,
            paddingRight: SPACING.lg,
            gap: SPACING.md,
            border: searchFocused
              ? `1.5px solid ${COLORS.primary.accent}`
              : `1.5px solid ${COLORS.neutral.grey100}`,
            boxShadow: searchFocused
              ? `${CSS_SHADOWS.medium}, ${CSS_SHADOWS.focused}`
              : CSS_SHADOWS.medium,
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}>
            <Icon name="search" size={18} color={searchFocused ? COLORS.primary.accent : COLORS.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="오늘 같이 밥 먹을 사람 찾기"
              placeholderTextColor={COLORS.neutral.grey400}
              value={searchQuery}
              onChangeText={handleSearchInput}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                setSearchFocused(true);
                setShowSearchSuggestions(searchQuery.length > 0);
              }}
              onBlur={() => {
                setSearchFocused(false);
                setTimeout(() => setShowSearchSuggestions(false), 150);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              aria-label="약속 검색"
            />
            {searchQuery.length > 0 && (
              <>
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Icon name="times" size={14} color={COLORS.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
                  <Icon name="search" size={12} color={COLORS.neutral.white} />
                </TouchableOpacity>
              </>
            )}
          </div>

          {/* 검색 제안 드롭다운 */}
          {showSearchSuggestions && (
            <View style={styles.suggestionsDropdown}>
              <Text style={styles.suggestionsLabel}>AI 검색 제안</Text>
              {searchSuggestions
                .filter(suggestion =>
                  searchQuery.length === 0 ||
                  suggestion.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .slice(0, 4)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Icon name="search" size={12} color={COLORS.text.tertiary} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </div>

        {/* 카테고리 그리드 (4x2) with CategoryIcon */}
        <FadeIn delay={100}>
          <div
            className="animate-fadeInUp stagger-1"
            style={{
              backgroundColor: COLORS.neutral.white,
              paddingTop: SPACING.md,
              paddingBottom: SPACING.xxl,
              paddingLeft: SPACING.xl,
              paddingRight: SPACING.xl,
              marginBottom: SPACING.sm,
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: SPACING.xl,
              gap: SPACING.lg,
            }}>
              {FOOD_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  onClick={() => navigate(`/explore?category=${encodeURIComponent(category.name)}`)}
                  onMouseEnter={() => setHoveredCategoryId(category.id)}
                  onMouseLeave={() => setHoveredCategoryId(null)}
                  style={{
                    width: '21%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  role="button"
                  aria-label={category.name}
                >
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: BORDER_RADIUS.lg,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: SPACING.sm,
                    backgroundColor: hoveredCategoryId === category.id ? COLORS.surface.secondary : category.bgColor,
                    border: `1px solid ${hoveredCategoryId === category.id ? COLORS.neutral.grey200 : 'rgba(17,17,17,0.06)'}`,
                    transition: 'all 200ms ease',
                    boxShadow: hoveredCategoryId === category.id ? CSS_SHADOWS.small : 'none',
                    transform: hoveredCategoryId === category.id ? 'translateY(-2px)' : 'translateY(0)',
                  }}>
                    <CategoryIcon
                      iconName={category.icon}
                      image={category.image}
                      size={48}
                      color={category.color}
                      backgroundColor={hoveredCategoryId === category.id ? COLORS.surface.secondary : category.bgColor}
                    />
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: '500',
                    lineHeight: '16px',
                    letterSpacing: 0.1,
                    color: COLORS.text.secondary,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}>{category.name}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* 광고 배너 */}
        <AdvertisementBanner position="home_banner" navigation={navigation} />

        {/* 섹션 1: 곧 시작하는 밥약속 */}
        {(isLoading || soonMeetups.length > 0) && (
          <FadeIn delay={200}>
            <div
              className="animate-fadeInUp stagger-2"
              style={{
                paddingTop: SPACING.section?.paddingTop || 28,
                paddingBottom: SPACING.lg,
                marginBottom: SPACING.sm,
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <SectionHeader
                title="곧 시작하는 밥약속"
                subtitle="2시간 이내 시작"
                onSeeAll={() => navigate('/explore')}
                seeAllKey="soon"
              />
              {isLoading ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.horizontalCardWrapper}>
                      <MeetupCardSkeleton variant="grid" />
                    </View>
                  ))}
                </ScrollView>
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {soonMeetups.map((meetup) => {
                    if (!meetup.id) return null;
                    return (
                      <div
                        key={meetup.id}
                        onMouseEnter={() => setHoveredCardId(`soon-${meetup.id}`)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        style={{
                          width: 240,
                          transition: 'all 200ms ease',
                          transform: hoveredCardId === `soon-${meetup.id}` ? 'translateY(-3px)' : 'none',
                          boxShadow: hoveredCardId === `soon-${meetup.id}` ? CSS_SHADOWS.cardHover : 'none',
                          borderRadius: BORDER_RADIUS.lg,
                        }}
                      >
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupClick}
                          variant="grid"
                        />
                      </div>
                    );
                  })}
                </ScrollView>
              )}
            </div>
          </FadeIn>
        )}

        {/* 섹션 2: 새로 올라온 밥약속 */}
        {(isLoading || newMeetups.length > 0) && (
          <FadeIn delay={300}>
            <div
              className="animate-fadeInUp stagger-3"
              style={{
                paddingTop: SPACING.section?.paddingTop || 28,
                paddingBottom: SPACING.lg,
                marginBottom: SPACING.sm,
                backgroundColor: COLORS.surface.secondary,
              }}
            >
              <SectionHeader
                title="새로 올라온 밥약속"
                subtitle="방금 등록된 새 밥약속"
                onSeeAll={() => navigate('/explore')}
                seeAllKey="new"
              />
              {isLoading ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.horizontalCardWrapper}>
                      <MeetupCardSkeleton variant="grid" />
                    </View>
                  ))}
                </ScrollView>
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {newMeetups.map((meetup) => {
                    if (!meetup.id) return null;
                    return (
                      <div
                        key={meetup.id}
                        onMouseEnter={() => setHoveredCardId(`new-${meetup.id}`)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        style={{
                          width: 240,
                          transition: 'all 200ms ease',
                          transform: hoveredCardId === `new-${meetup.id}` ? 'translateY(-3px)' : 'none',
                          boxShadow: hoveredCardId === `new-${meetup.id}` ? CSS_SHADOWS.cardHover : 'none',
                          borderRadius: BORDER_RADIUS.lg,
                        }}
                      >
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupClick}
                          variant="grid"
                        />
                      </div>
                    );
                  })}
                </ScrollView>
              )}
            </div>
          </FadeIn>
        )}

        {/* 섹션 3: 모집중인 밥약속 (세로 리스트) */}
        {(isLoading || recruitingMeetups.length > 0) && (
          <FadeIn delay={400}>
            <div
              className="animate-fadeInUp stagger-4"
              style={{
                paddingTop: SPACING.section?.paddingTop || 28,
                paddingBottom: SPACING.lg,
                marginBottom: SPACING.sm,
                backgroundColor: COLORS.neutral.white,
              }}
            >
              <SectionHeader
                title="모집중인 밥약속"
                subtitle="함께할 사람을 찾고 있어요"
                onSeeAll={() => navigate('/explore')}
                seeAllKey="recruiting"
              />
              {isLoading ? (
                <View style={styles.verticalList}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.verticalListItem}>
                      <MeetupCardSkeleton variant="list" />
                    </View>
                  ))}
                </View>
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <View style={styles.verticalList}>
                  {recruitingMeetups.map((meetup) => {
                    if (!meetup.id) return null;
                    return (
                      <div
                        key={meetup.id}
                        onMouseEnter={() => setHoveredCardId(`rec-${meetup.id}`)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        style={{
                          transition: 'all 200ms ease',
                          transform: hoveredCardId === `rec-${meetup.id}` ? 'translateY(-2px)' : 'none',
                          boxShadow: hoveredCardId === `rec-${meetup.id}` ? CSS_SHADOWS.cardHover : 'none',
                          borderRadius: BORDER_RADIUS.lg,
                        }}
                      >
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupClick}
                          variant="compact"
                        />
                      </div>
                    );
                  })}
                </View>
              )}
            </div>
          </FadeIn>
        )}

        {/* 밥약속이 전혀 없을 때 */}
        {!isLoading && !fetchError && meetups.length === 0 && (
          <EmptyState
            icon="&#x1F37D;"
            title="아직 등록된 밥약속이 없어요"
            description="첫 번째 밥약속을 만들어보세요!"
            actionLabel="약속 만들기"
            onAction={() => setShowCreateMeetup(true)}
          />
        )}

        {/* 모든 약속 보기 버튼 -- 테라코타 CTA */}
        <div
          onClick={() => navigate('/explore')}
          onMouseEnter={() => setHoveredAllMeetups(true)}
          onMouseLeave={() => setHoveredAllMeetups(false)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.sm,
            marginLeft: SPACING.xl,
            marginRight: SPACING.xl,
            marginTop: SPACING.lg,
            marginBottom: SPACING.xl,
            paddingTop: 14,
            paddingBottom: 14,
            background: COLORS.gradient.ctaCSS,
            borderRadius: BORDER_RADIUS.md,
            cursor: 'pointer',
            transition: 'all 200ms ease',
            transform: hoveredAllMeetups ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredAllMeetups ? CSS_SHADOWS.cta : CSS_SHADOWS.card,
          }}
          role="button"
          aria-label="모든 약속 보기"
        >
          <span style={{
            fontSize: 14,
            fontWeight: '600',
            letterSpacing: -0.03,
            color: COLORS.neutral.white,
          }}>모든 약속 보기</span>
          <span style={{ color: COLORS.neutral.white, fontSize: 14 }}>&#x203A;</span>
        </div>

        {/* 하단 여백 */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Scroll to Top */}
      {showScrollTop && (
        <div
          onClick={scrollToTop}
          className="animate-scaleIn"
          style={{
            position: 'fixed',
            bottom: 170,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: COLORS.neutral.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: CSS_SHADOWS.medium,
            cursor: 'pointer',
            zIndex: 999,
            border: `1px solid ${COLORS.neutral.grey100}`,
          }}
          role="button"
          aria-label="맨 위로"
        >
          <span style={{ fontSize: 16, color: COLORS.text.secondary }}>&#x2191;</span>
        </div>
      )}

      {/* FAB — 테라코타 악센트, 확장형 */}
      <div
        onClick={() => setShowCreateMeetup(true)}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => { setFabHovered(false); setFabPressed(false); }}
        onMouseDown={() => setFabPressed(true)}
        onMouseUp={() => setFabPressed(false)}
        className="animate-scaleIn"
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          height: 48,
          paddingLeft: 16,
          paddingRight: 20,
          borderRadius: BORDER_RADIUS.md,
          background: fabPressed
            ? COLORS.primary.main
            : COLORS.gradient.ctaCSS,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          boxShadow: fabHovered ? CSS_SHADOWS.hover : CSS_SHADOWS.cta,
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 200ms ease',
          transform: fabPressed ? 'scale(0.97)' : fabHovered ? 'translateY(-2px)' : 'none',
          animationDelay: '800ms',
        }}
        role="button"
        aria-label="새 약속 만들기"
      >
        <span style={{ fontSize: 20, color: COLORS.neutral.white, fontWeight: '300', lineHeight: '20px' }}>+</span>
        <span style={{ fontSize: 14, fontWeight: '600', color: COLORS.neutral.white, whiteSpace: 'nowrap' }}>약속 만들기</span>
      </div>

      {/* 모달들 */}
      <Modal
        visible={showCreateMeetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CreateMeetupWizard
          user={user}
          onClose={() => setShowCreateMeetup(false)}
        />
      </Modal>

      <NeighborhoodSelector
        visible={showNeighborhoodSelector}
        onClose={() => setShowNeighborhoodSelector(false)}
        onSelect={handleNeighborhoodSelect}
        currentNeighborhood={currentNeighborhood}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },

  // ─── 헤더 — 미니멀 에디토리얼 ──────────────────────────
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.neutral.white,
    gap: SPACING.md,
  },
  headerLogoWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
  },
  headerLogoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: FONT_WEIGHTS.bold as any,
    letterSpacing: -0.5,
    color: COLORS.primary.main,
    lineHeight: 30,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface.secondary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  locationText: {
    ...TYPOGRAPHY.location.primary,
    fontWeight: FONT_WEIGHTS.semiBold as any,
  },
  headerRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  // ─── 스크롤 영역 ─────────────────────────────────────
  scrollView: {
    flex: 1,
  },

  // ─── 검색 바 ─────────────────────────────────────────
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.regular as any,
    lineHeight: 20,
    letterSpacing: -0.05,
    color: COLORS.text.primary,
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
  },
  clearButton: {
    padding: SPACING.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSubmitButton: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── 검색 제안 ─────────────────────────────────────
  suggestionsDropdown: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  suggestionsLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary.accent,
    fontWeight: FONT_WEIGHTS.semiBold as any,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    minHeight: 44,
  },
  suggestionText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },

  // ─── 카드 리스트 ───────────────────────────────────────
  horizontalCardList: {
    paddingLeft: SPACING.xl,
    paddingRight: SPACING.xl,
    gap: SPACING.lg,
  },
  horizontalCardWrapper: {
    width: 240,
  },

  // ─── 세로 리스트 ─────────────────────────────────────
  verticalList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  verticalListItem: {
    marginBottom: SPACING.md,
  },

  // ─── 하단 여백 ───────────────────────────────────────
  bottomPadding: {
    height: 96,
  },
});

export default HomeScreen;
