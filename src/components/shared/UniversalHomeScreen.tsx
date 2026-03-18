import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, SHADOWS, LAYOUT, CARD_STYLE, CTA_STYLE} from '../../styles/colors';
import {SPACING, BORDER_RADIUS, LIST_ITEM_STYLE, HEADER_STYLE} from '../../styles/spacing';
import {TYPOGRAPHY, FONT_WEIGHTS} from '../../styles/typography';
import {Icon} from '../Icon';
import { NotificationBell } from '../NotificationBell';
import NeighborhoodSelector from '../NeighborhoodSelector';
import NativeMapModal from '../NativeMapModal';
import MeetupCard from '../MeetupCard';
import SectionHeader from '../SectionHeader';
import HeroBannerCarousel from '../HeroBannerCarousel';
import FadeIn from '../animated/FadeIn';
import MeetupCardSkeleton from '../skeleton/MeetupCardSkeleton';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import { FOOD_CATEGORIES } from '../../constants/categories';
import AdvertisementBanner from '../AdvertisementBanner';
import Popup from '../Popup';
import { usePopup } from '../../hooks/usePopup';
// NotificationBanner는 props로 전달받음 (import 불필요)

// 플랫폼별 네비게이션 인터페이스
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalHomeScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  navigateToLogin?: () => void;
  // 플랫폼별 컴포넌트들
  CreateMeetupModal?: React.ComponentType<any>;
  MapTestModal?: React.ComponentType<any>;
  NeighborhoodModal?: React.ComponentType<any>;
  NotificationBanner?: React.ComponentType<any>;
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

// 카테고리 이모지 매핑
const getCategoryEmoji = (id: string): string => {
  const map: Record<string, string> = {
    korean: '\uD83C\uDF5A',
    chinese: '\uD83E\uDD5F',
    japanese: '\uD83C\uDF63',
    western: '\uD83C\uDF5D',
    bbq: '\uD83E\uDD69',
    seafood: '\uD83E\uDD90',
    hotpot: '\uD83C\uDF72',
    cafe: '\u2615',
    bar: '\uD83C\uDF7A',
    etc: '\uD83C\uDF7D',
  };
  return map[id] || '\uD83C\uDF7D';
};

// 반경 포맷팅 함수
const formatRadius = (radiusInMeters: number | undefined): string => {
  if (!radiusInMeters) {return '3km';}
  if (radiusInMeters < 1000) {
    return `${radiusInMeters}m`;
  }
  return `${(radiusInMeters / 1000).toFixed(1)}km`;
};

const UniversalHomeScreen: React.FC<UniversalHomeScreenProps> = ({
  navigation,
  user,
  navigateToLogin,
  CreateMeetupModal,
  MapTestModal,
  NotificationBanner,
}) => {
  const { updateNeighborhood, user: storeUser } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
  const scrollViewRef = useRef<ScrollView>(null);

  // 상태 관리
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showMapTest, setShowMapTest] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [showNeighborhoodMapModal, setShowNeighborhoodMapModal] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { greeting, subtitle: greetingSubtitle } = getGreeting();

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const neighborhood = storeUser?.neighborhood;
    const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
      ? fetchHomeMeetups({
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          radius: neighborhood.radius || 3000,
        })
      : fetchHomeMeetups();

    fetchPromise
      .catch(() => setFetchError(true))
      .finally(() => setRefreshing(false));
  }, [storeUser?.neighborhood, fetchHomeMeetups]);

  const {
    popupState,
    hidePopup,
    showSuccess,
  } = usePopup();

  // 검색 제안 데이터
  const searchSuggestions = [
    '우울할때 갈만한 밥약속 추천해줘',
    '스트레스 받을 때 좋은 곳',
    '혼자 갈 수 있는 카페',
    '맛있는 한식 밥약속',
    '저렴한 술집 약속',
    '새로운 사람들과 친해지기',
  ];

  // 데이터 로딩 - 사용자 위치 기반
  useEffect(() => {
    const loadMeetups = () => {
      setFetchError(false);
      const neighborhood = storeUser?.neighborhood;
      const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
        ? fetchHomeMeetups({
            latitude: neighborhood.latitude,
            longitude: neighborhood.longitude,
            radius: neighborhood.radius || 3000,
          })
        : fetchHomeMeetups();

      fetchPromise
        .catch(() => setFetchError(true))
        .finally(() => setIsLoading(false));
    };

    loadMeetups();
  }, [storeUser?.neighborhood?.latitude, storeUser?.neighborhood?.longitude, storeUser?.neighborhood?.radius]);

  // 위치 설정 - React Native에서는 기본값을 사용
  useEffect(() => {
    setCurrentNeighborhood({
      district: '강남구',
      neighborhood: '역삼동'
    });
  }, []);

  // ─── 섹션별 모임 데이터 분류 (useMemo로 최적화) ─────────
  const soonMeetups = useMemo(() => {
    const now = new Date();
    return meetups
      .filter((m: any) => {
        if (!m.date) return false;
        const meetupDate = new Date(m.date);
        const diffMs = meetupDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > -2 && diffHours < 48 && m.status === 'recruiting';
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [meetups]);

  const newMeetups = useMemo(() => {
    return [...meetups]
      .sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || a.updatedAt).getTime();
        const bTime = new Date(b.createdAt || b.updatedAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [meetups]);

  const recruitingMeetups = useMemo(() => {
    return meetups
      .filter((m: any) => m.status === 'recruiting')
      .slice(0, 10);
  }, [meetups]);

  // 스크롤 핸들러
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(offsetY > 400);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // 이벤트 핸들러들
  const handleMeetupClick = useCallback((meetup: any) => {
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    navigation.navigate('MeetupDetail', { meetupId });
  }, [navigation]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setShowSearchSuggestions(false);
      navigation.navigate('AISearchResult', { query: searchQuery, autoSearch: true });
    }
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    setShowSearchSuggestions(text.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const handleSuggestionPress = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    setTimeout(() => {
      navigation.navigate('AISearchResult', { query: suggestion, autoSearch: true });
    }, 100);
  };

  const handleLocationSelect = (district: string, neighborhood: string) => {
    updateNeighborhood(district, neighborhood);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);
    setShowNeighborhoodSelector(false);
    fetchHomeMeetups();
  };

  // NativeMapModal에서 위치 선택 처리 (lat, lng, address, radius 포함)
  const handleMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string, radius?: number) => {
    const radiusInMeters = radius ? radius * 1000 : 3000;
    updateNeighborhood(district, neighborhood, lat, lng, radiusInMeters);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);
    fetchHomeMeetups({
      latitude: lat,
      longitude: lng,
      radius: radiusInMeters,
    });
  };

  // NeighborhoodSelector에서 지도 모달 열기 요청 처리
  const handleOpenMapModal = () => {
    setShowNeighborhoodSelector(false);
    setTimeout(() => {
      setShowNeighborhoodMapModal(true);
    }, 300);
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(false);
    const neighborhood = storeUser?.neighborhood;
    const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
      ? fetchHomeMeetups({
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          radius: neighborhood.radius || 3000,
        })
      : fetchHomeMeetups();

    fetchPromise
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  };

  // ─── 가로 스크롤 스켈레톤 렌더링 ─────────────────
  const renderHorizontalSkeletons = () => (
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
  );

  // ─── 세로 리스트 스켈레톤 렌더링 ─────────────────
  const renderVerticalSkeletons = () => (
    <View style={styles.verticalList}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.verticalListItem}>
          <MeetupCardSkeleton variant="list" />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 고정 헤더 — 미니멀 에디토리얼 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={openNeighborhoodSelector}
            activeOpacity={0.7}
            accessibilityLabel="동네 변경"
            accessibilityRole="button"
          >
            <Icon name="map-pin" size={14} color={COLORS.primary.accent} />
            <Text style={styles.locationText} numberOfLines={1}>
              {currentNeighborhood ? `${currentNeighborhood.neighborhood}` : '역삼동'}
            </Text>
            {storeUser?.neighborhood?.radius && (
              <Text style={styles.radiusText} numberOfLines={1}>
                · {formatRadius(storeUser.neighborhood.radius)}
              </Text>
            )}
            <Icon name="chevron-down" size={14} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={() => {
                navigation.navigate('Notifications');
              }}
              color={COLORS.text.primary}
              size={22}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onScrollBeginDrag={() => setShowSearchSuggestions(false)}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary.accent}
              colors={[COLORS.primary.accent]}
            />
          }
        >
          {/* 인사말 + 히어로 배너 캐러셀 */}
          <FadeIn delay={0}>
            <View style={styles.greetingSection}>
              <Text style={styles.heroGreeting}>{greeting}</Text>
              <Text style={styles.heroSubtitle}>{greetingSubtitle}</Text>
            </View>
            <HeroBannerCarousel />
          </FadeIn>

          {/* 검색 바 — 히어로 아래 겹쳐서 배치 */}
          <View style={styles.searchSection}>
            <View
              style={[
                styles.searchBar,
                searchFocused && styles.searchBarFocused,
              ]}
            >
              <Icon name="search" size={20} color={searchFocused ? COLORS.primary.accent : COLORS.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="오늘 같이 밥 먹을 사람 찾기"
                placeholderTextColor={COLORS.neutral.grey400}
                value={searchQuery}
                onChangeText={handleSearchInput}
                onFocus={() => {
                  setSearchFocused(true);
                  setShowSearchSuggestions(searchQuery.length > 0);
                }}
                onBlur={() => {
                  setSearchFocused(false);
                  setTimeout(() => setShowSearchSuggestions(false), 150);
                }}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="약속 검색"
              />
              {searchQuery.length > 0 && (
                <>
                  <TouchableOpacity
                    onPress={clearSearch}
                    style={styles.clearButton}
                    activeOpacity={0.7}
                    accessibilityLabel="검색어 지우기"
                  >
                    <Icon name="times" size={14} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSearch}
                    style={styles.searchSubmitButton}
                    activeOpacity={0.7}
                    accessibilityLabel="검색"
                  >
                    <Icon name="search" size={12} color={COLORS.neutral.white} />
                  </TouchableOpacity>
                </>
              )}
            </View>

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
                      activeOpacity={0.7}
                      accessibilityLabel={suggestion}
                    >
                      <Icon name="search" size={12} color={COLORS.text.tertiary} />
                      <Text style={styles.suggestionText} numberOfLines={1} ellipsizeMode="tail">{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>

          {/* 카테고리 5열 그리드 */}
          <FadeIn delay={100}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryGridItem}
                onPress={() => navigation.navigate('MeetupList', { category: category.name })}
                activeOpacity={0.7}
                accessibilityLabel={`${category.name} 카테고리`}
                accessibilityRole="button"
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: category.bgColor }]}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(category.id)}</Text>
                </View>
                <Text style={styles.categoryGridLabel} numberOfLines={1}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          </FadeIn>

          {/* 광고 배너 */}
          <AdvertisementBanner position="home_banner" navigation={navigation} />

          {/* 섹션 1: 곧 시작하는 밥약속 */}
          {(isLoading || soonMeetups.length > 0) && (
            <FadeIn delay={200}>
            <View style={[styles.contentSection, { backgroundColor: COLORS.neutral.white }]}>
              <SectionHeader
                emoji={'\uD83D\uDD25'}
                title="곧 시작하는 밥약속"
                subtitle="2시간 이내 시작"
                onSeeAll={() => navigation.navigate('MeetupList')}
              />
              {isLoading ? (
                renderHorizontalSkeletons()
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {soonMeetups.map((meetup: any) => {
                    if (!meetup.id) return null;
                    return (
                      <View key={meetup.id} style={styles.horizontalCardWrapper}>
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupClick}
                          variant="grid"
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            </FadeIn>
          )}

          {/* 섹션 2: 새로 올라온 밥약속 */}
          {(isLoading || newMeetups.length > 0) && (
            <FadeIn delay={300}>
            <View style={[styles.contentSection, { backgroundColor: COLORS.surface.secondary }]}>
              <SectionHeader
                emoji={'\u2728'}
                title="새로 올라온 밥약속"
                subtitle="방금 등록된 새 밥약속"
                onSeeAll={() => navigation.navigate('MeetupList')}
              />
              {isLoading ? (
                renderHorizontalSkeletons()
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardList}
                >
                  {newMeetups.map((meetup: any) => {
                    if (!meetup.id) return null;
                    return (
                      <View key={meetup.id} style={styles.horizontalCardWrapper}>
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupClick}
                          variant="grid"
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            </FadeIn>
          )}

          {/* 섹션 3: 모집중인 밥약속 */}
          {(isLoading || recruitingMeetups.length > 0) && (
            <FadeIn delay={400}>
            <View style={[styles.contentSection, { backgroundColor: COLORS.neutral.white }]}>
              <SectionHeader
                emoji={'\uD83D\uDCE2'}
                title="모집중인 밥약속"
                subtitle="함께할 사람을 찾고 있어요"
                onSeeAll={() => navigation.navigate('MeetupList')}
              />
              {isLoading ? (
                renderVerticalSkeletons()
              ) : fetchError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <View style={styles.verticalList}>
                  {recruitingMeetups.map((meetup: any) => {
                    if (!meetup.id) return null;
                    return (
                      <MeetupCard
                        key={meetup.id}
                        meetup={meetup}
                        onPress={handleMeetupClick}
                        variant="compact"
                      />
                    );
                  })}
                </View>
              )}
            </View>
            </FadeIn>
          )}

          {/* 밥약속이 전혀 없을 때 */}
          {!isLoading && !fetchError && meetups.length === 0 && (
            <EmptyState
              icon={'\uD83C\uDF7D\uFE0F'}
              title="아직 등록된 밥약속이 없어요"
              description="첫 번째 밥약속을 만들어보세요!"
              actionLabel="약속 만들기"
              onAction={() => navigation.navigate('CreateMeetup')}
            />
          )}

          {/* 모든 약속 보기 버튼 -- 그라데이션 CTA */}
          <TouchableOpacity
            style={styles.allMeetupsButtonWrapper}
            onPress={() => navigation.navigate('MeetupList')}
            activeOpacity={0.7}
            accessibilityLabel="모든 약속 보기"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={COLORS.gradient.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.allMeetupsButton}
            >
              <Text style={styles.allMeetupsText}>모든 약속 보기</Text>
              <Text style={styles.allMeetupsChevron}>{'\u203A'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 지도 테스트 버튼 (디버그용 - 개발 환경에서만 표시) */}
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: COLORS.primary.main, margin: 20 }]}
              onPress={() => setShowMapTest(true)}
            >
              <Text style={styles.testButtonText}>지도테스트</Text>
            </TouchableOpacity>
          )}

          {/* 하단 여백 */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Scroll to Top */}
        {showScrollTop && (
          <TouchableOpacity
            style={styles.scrollTopButton}
            onPress={scrollToTop}
            activeOpacity={0.7}
            accessibilityLabel="맨 위로 스크롤"
            accessibilityRole="button"
          >
            <Text style={styles.scrollTopText}>{'\u2191'}</Text>
          </TouchableOpacity>
        )}

        {/* FAB — 테라코타 악센트, 확장형 필 */}
        <TouchableOpacity
          style={styles.fabWrapper}
          onPress={() => navigation.navigate('CreateMeetup')}
          activeOpacity={0.7}
          accessibilityLabel="새 약속 만들기"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={COLORS.gradient.cta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Text style={styles.fabIcon}>+</Text>
            <Text style={styles.fabLabel}>약속 만들기</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 모달들 */}
        <NeighborhoodSelector
          visible={showNeighborhoodSelector}
          onClose={() => {
            setShowNeighborhoodSelector(false);
          }}
          onSelect={handleLocationSelect}
          currentNeighborhood={currentNeighborhood}
          onOpenMapModal={handleOpenMapModal}
        />

        {/* NativeMapModal - NeighborhoodSelector와 분리하여 렌더링 */}
        <NativeMapModal
          visible={showNeighborhoodMapModal}
          onClose={() => setShowNeighborhoodMapModal(false)}
          onLocationSelect={handleMapLocationSelect}
          mode="settings"
          initialRadius={storeUser?.neighborhood?.radius ? Math.round(storeUser.neighborhood.radius / 1000) : undefined}
        />

        {CreateMeetupModal && (
          <CreateMeetupModal
            visible={showCreateMeetup}
            onClose={() => setShowCreateMeetup(false)}
            onSuccess={() => {
              setShowCreateMeetup(false);
              showSuccess('밥약속이 성공적으로 만들어졌습니다!');
              fetchHomeMeetups();
            }}
          />
        )}

        {__DEV__ && MapTestModal && showMapTest && (
          <MapTestModal
            visible={showMapTest}
            onClose={() => setShowMapTest(false)}
          />
        )}

        <Popup
          visible={popupState.visible}
          onClose={hidePopup}
          type={popupState.type}
          title={popupState.title}
          message={popupState.message}
          buttons={popupState.buttons}
          showCloseButton={popupState.showCloseButton}
          backdrop={popupState.backdrop}
          animation={popupState.animation}
        />

        {NotificationBanner && (
          <NotificationBanner />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
    overflow: 'hidden',
  },

  // ─── 헤더 (미니멀 에디토리얼) ──────────────────────────
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.sticky,
    gap: SPACING.md,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
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
  radiusText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text.tertiary,
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

  // ─── 인사말 섹션 ──────────────────────────────────────
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '700' as any,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '400' as any,
    lineHeight: 20,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },

  // ─── 검색 바 ───────────────────────────────────────────
  searchSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
    position: 'relative',
    zIndex: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grey100,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  searchBarFocused: {
    borderColor: COLORS.primary.accent,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.focused,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    backgroundColor: 'transparent',
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
    ...SHADOWS.cta,
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

  // ─── 카테고리 5열 그리드 ──────────────────────────────
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 0,
  },
  categoryGridItem: {
    width: '20%' as any,
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryGridLabel: {
    fontSize: 12,
    fontWeight: '500' as any,
    color: COLORS.text.secondary,
    marginTop: 6,
  },

  // ─── 콘텐츠 섹션 (에디토리얼 깔끔한 구분) ──────────────
  contentSection: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    overflow: 'hidden',
  },
  horizontalCardList: {
    paddingLeft: SPACING.xl,
    paddingRight: SPACING.xl,
    gap: SPACING.md,
  },
  horizontalCardWrapper: {
    width: 250,
  },

  // ─── 세로 리스트 ─────────────────────────────────────
  verticalList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  verticalListItem: {
    marginBottom: SPACING.md,
  },

  // ─── 모든 모임 보기 버튼 (그라데이션 CTA) ─────────────
  allMeetupsButtonWrapper: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  allMeetupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
  },
  allMeetupsText: {
    fontSize: 14,
    fontWeight: '600' as any,
    letterSpacing: -0.03,
    color: COLORS.neutral.white,
  },
  allMeetupsChevron: {
    color: COLORS.neutral.white,
    fontSize: 14,
  },

  // ─── Scroll to Top ────────────────────────────────────
  scrollTopButton: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    zIndex: 999,
  },
  scrollTopText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },

  // ─── FAB (테라코타 악센트, 확장형 필) ────────────────────
  fabWrapper: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.cta,
  },
  fab: {
    height: 48,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fabIcon: {
    fontSize: 20,
    color: COLORS.neutral.white,
    fontWeight: '300' as any,
    lineHeight: 20,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '600' as any,
    color: COLORS.neutral.white,
  },

  // ─── 테스트 버튼 (디버그용) ───────────────────────────
  testButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.semiBold as any,
    color: COLORS.text.white,
  },

  // ─── 하단 여백 ───────────────────────────────────────
  bottomPadding: {
    height: 96,
  },
});

export default UniversalHomeScreen;
