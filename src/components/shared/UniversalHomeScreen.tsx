import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {COLORS, SHADOWS, LAYOUT} from '../../styles/colors';
import {SPACING, BORDER_RADIUS} from '../../styles/spacing';
import {Icon} from '../Icon';
import { NotificationBell } from '../NotificationBell';
import NeighborhoodSelector from '../NeighborhoodSelector';
import NativeMapModal from '../NativeMapModal';
import MeetupCard from '../MeetupCard';
import MeetupCardSkeleton from '../skeleton/MeetupCardSkeleton';
import EmptyState from '../EmptyState';
import locationService from '../../services/locationService';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import { FOOD_CATEGORIES } from '../../constants/categories';
import AdvertisementBanner from '../AdvertisementBanner';
import { useMeetups } from '../../hooks/useMeetups';
import { aiSearchService } from '../../services/aiSearchService';
import Popup from '../Popup';
import { usePopup } from '../../hooks/usePopup';
import { useNotificationBanner } from '../../hooks/useNotificationBanner';
import NotificationBanner from '../NotificationBanner';
import nativeBridge from '../../utils/nativeBridge';

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
}

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
  const { searchMeetups, meetups: searchResults, loading: searchLoading } = useMeetups();

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

  const {
    popupState,
    hidePopup,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showAlert
  } = usePopup();

  // 검색 제안 데이터
  const searchSuggestions = [
    '근처 한식당 찾기',
    '오늘 저녁 함께 먹을 사람',
    '중국집 배달 같이 시킬 사람',
    '카페에서 브런치',
    '혼밥족 모임',
    '맛집 탐방 친구',
    '치킨 같이 먹기',
    '분위기 좋은 술집',
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

  // 이벤트 핸들러들
  const handleMeetupClick = (meetup: any) => {
    navigation.navigate('MeetupDetail', { meetupId: meetup.id });
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setShowSearchSuggestions(false);
      navigation.navigate('AISearchResult', { query: searchQuery, autoSearch: true });
    }
  };

  const handleSuggestionPress = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    navigation.navigate('AISearchResult', { query: suggestion, autoSearch: true });
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

  const getCategoryColor = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : COLORS.primary.main;
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleNotificationTest = () => {
    try {
      if (nativeBridge.isNativeApp()) {
        nativeBridge.scheduleNotification(
          '혼밥노노 알림',
          '5초 후 네이티브 알림입니다!',
          5,
          { type: 'scheduled', timestamp: new Date().toISOString() }
        );
        showInfo('5초 후 네이티브 알림이 표시됩니다...');
      } else {
        setTimeout(() => {
          alert('5초 후 웹 알림입니다! 새로운 밥친구가 근처에 있어요');
        }, 5000);
        showInfo('5초 후 웹 알림이 표시됩니다...');
      }
    } catch (error) {
      showError('알림 예약에 실패했습니다.');
    }
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

  // ─── 섹션 헤더 렌더링 ─────────────────────────────
  const renderSectionHeader = (emoji: string, title: string) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('MeetupList')}>
        <Text style={styles.seeAllText}>더보기</Text>
      </TouchableOpacity>
    </View>
  );

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

  // ─── 에러 상태 렌더링 ─────────────────────────────
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>데이터를 불러오지 못했어요</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>혼밥시러</Text>
          <TouchableOpacity style={styles.locationButton} onPress={openNeighborhoodSelector}>
            <Icon name="map-pin" size={14} color={COLORS.primary.main} style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>
              {currentNeighborhood ? `${currentNeighborhood.district} ${currentNeighborhood.neighborhood}` : '위치 설정'}
            </Text>
            {storeUser?.neighborhood?.radius && (
              <Text style={styles.radiusText}>
                · {formatRadius(storeUser.neighborhood.radius)}
              </Text>
            )}
            <Icon name="chevron-down" size={14} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={() => {
                navigation.navigate('Notifications');
              }}
              color={COLORS.text.primary}
            />
          </View>
        </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setShowSearchSuggestions(false)}
      >

        {/* 검색 섹션 */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={18} color={COLORS.text.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="오늘은 뭘 먹을까요? AI가 추천해드려요!"
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Icon name="x" size={16} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                  >
                    <Text style={styles.searchButtonText}>검색</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* 검색 제안 */}
            {showSearchSuggestions && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsLabel}>AI 검색 제안</Text>
                <View style={styles.suggestionsList}>
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
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => navigation.navigate('MeetupList', { category: category.name })}
              >
                <View style={[styles.categoryBox, { backgroundColor: category.bgColor }]}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 광고 섹션 */}
        <AdvertisementBanner position="home_banner" navigation={navigation} />

        {/* 섹션 1: 곧 시작하는 밥약속 */}
        {(isLoading || soonMeetups.length > 0) && (
          <View style={styles.contentSection}>
            {renderSectionHeader('\u23F0', '곧 시작하는 밥약속')}
            {isLoading ? (
              renderHorizontalSkeletons()
            ) : fetchError ? (
              renderErrorState()
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
        )}

        {/* 섹션 2: 새로 올라온 모임 */}
        {(isLoading || newMeetups.length > 0) && (
          <View style={styles.contentSection}>
            {renderSectionHeader('\u2728', '새로 올라온 모임')}
            {isLoading ? (
              renderHorizontalSkeletons()
            ) : fetchError ? (
              renderErrorState()
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
        )}

        {/* 섹션 3: 모집중인 모임 (세로 리스트) */}
        {(isLoading || recruitingMeetups.length > 0) && (
          <View style={styles.contentSection}>
            {renderSectionHeader('\uD83E\uDD1D', '모집중인 모임')}
            {isLoading ? (
              renderVerticalSkeletons()
            ) : fetchError ? (
              renderErrorState()
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
        )}

        {/* 모임이 전혀 없을 때 */}
        {!isLoading && !fetchError && meetups.length === 0 && (
          <EmptyState
            icon="\uD83C\uDF7D\uFE0F"
            title="아직 등록된 모임이 없어요"
            description="첫 번째 모임을 만들어보세요!"
            actionLabel="모임 만들기"
            onAction={() => navigation.navigate('CreateMeetup')}
          />
        )}

        {/* 모든 모임 보기 버튼 */}
        {!isLoading && meetups.length > 0 && (
          <TouchableOpacity
            style={styles.allMeetupsButton}
            onPress={() => navigation.navigate('MeetupList')}
            activeOpacity={0.7}
          >
            <Text style={styles.allMeetupsText}>모든 모임 보기</Text>
            <Icon name="chevron-right" size={16} color={COLORS.primary.main} />
          </TouchableOpacity>
        )}

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

      {/* FAB 버튼 - 모임 생성 (Enhanced) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMeetup')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color={COLORS.neutral.white} />
        <Text style={styles.fabText}>모임 만들기</Text>
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
            showSuccess('모임이 성공적으로 생성되었습니다!');
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
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        onConfirm={() => {
          if (popupState.onConfirm) {popupState.onConfirm();}
          hidePopup();
        }}
        onCancel={() => {
          if (popupState.onCancel) {popupState.onCancel();}
          hidePopup();
        }}
        confirmText={popupState.confirmText}
        cancelText={popupState.cancelText}
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
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    gap: SPACING.md,
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary.main,
    letterSpacing: -0.5,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 2,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testButton: {
    backgroundColor: COLORS.functional.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  searchSection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
    borderWidth: 2,
    borderColor: `${COLORS.primary.main}30`,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  searchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  suggestionsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: COLORS.neutral.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  categorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    rowGap: 16,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },

  // ─── 콘텐츠 섹션 (새로운 카드 섹션) ───────────────────
  contentSection: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },

  // ─── 가로 스크롤 카드 리스트 ──────────────────────────
  horizontalCardList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  horizontalCardWrapper: {
    width: 200,
  },

  // ─── 세로 리스트 ──────────────────────────────────────
  verticalList: {
    paddingHorizontal: 0,
  },
  verticalListItem: {
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },

  // ─── 에러 상태 ────────────────────────────────────────
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },

  // ─── 모든 모임 보기 버튼 ──────────────────────────────
  allMeetupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  allMeetupsText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // ─── FAB (Enhanced) ───────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: COLORS.primary.main,
    elevation: 12,
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    zIndex: 1000,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },

  // ─── 하단 여백 ────────────────────────────────────────
  bottomPadding: {
    height: SPACING.xxxl,
  },

});

export default UniversalHomeScreen;
