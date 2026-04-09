import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { BORDER_RADIUS, LIST_ITEM_STYLE } from '../../styles/spacing';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import MeetupMapView from '../MeetupMapView';
import MeetupMarkerPopup from '../MeetupMarkerPopup';
import EmptyState from '../EmptyState';
import FilterDropdown from '../FilterDropdown';
import CategoryTabBar from '../CategoryTabBar';
import { FadeIn } from '../animated';
import { MeetupCardSkeleton } from '../skeleton';
import { useUserStore } from '../../store/userStore';
import { API_HOSTS } from '../../services/apiClient';

const API_URL = Platform.OS === 'web'
  ? (process.env.REACT_APP_API_URL || 'http://localhost:3001')
  : `http://${API_HOSTS[0]}:3001`;

// 기본 검색 반경 (5km)
const DEFAULT_RADIUS = 5000;

const RADIUS_OPTIONS = [
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
];

interface Meetup {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  address?: string;
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  image?: string;
  status: string;
  hostId: string;
  hostName?: string;
  hostProfileImage?: string;
  distance?: number;
  createdAt?: string;
}

interface UniversalExploreScreenProps {
  navigation: any;
}

const formatRadiusLabel = (radiusValue: number): string => {
  if (radiusValue >= 1000) {
    return `${radiusValue / 1000}km`;
  }
  return `${radiusValue}m`;
};

const formatDistance = (meters: number | null | undefined): string => {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const UniversalExploreScreen: React.FC<UniversalExploreScreenProps> = ({ navigation }) => {
  // User store에서 neighborhood 설정 가져오기
  const { user } = useUserStore();
  const userNeighborhood = user?.neighborhood;

  // 사용자 설정 반경 (없으면 기본값 5km)
  const userRadius = userNeighborhood?.radius || DEFAULT_RADIUS;

  // State
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(userRadius);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Default center (사용자 설정이 있으면 사용, 없으면 강남역)
  const [center, setCenter] = useState({
    latitude: userNeighborhood?.latitude || 37.498095,
    longitude: userNeighborhood?.longitude || 127.027610,
  });

  // Search center (for "search here" functionality)
  const [searchCenter, setSearchCenter] = useState({
    latitude: userNeighborhood?.latitude || 37.498095,
    longitude: userNeighborhood?.longitude || 127.027610,
  });

  // Filter meetups based on search query
  const filteredMeetups = useMemo(() => {
    if (!searchQuery.trim()) {return meetups;}
    const query = searchQuery.toLowerCase();
    return meetups.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.location.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        (m.description && m.description.toLowerCase().includes(query))
    );
  }, [meetups, searchQuery]);

  // Apply category + gender + age filters on top of search filter
  const displayMeetups = useMemo(() => {
    let result = filteredMeetups;
    if (selectedCategory) {
      result = result.filter(m => m.category === selectedCategory);
    }
    if (selectedGender) {
      result = result.filter(m => !m.genderPreference || m.genderPreference === selectedGender || m.genderPreference === '무관');
    }
    if (selectedAge) {
      result = result.filter(m => !m.ageRange || m.ageRange.includes(selectedAge));
    }
    return result;
  }, [filteredMeetups, selectedCategory, selectedGender, selectedAge]);

  // Fetch nearby meetups
  const fetchNearbyMeetups = useCallback(async (lat: number, lng: number, searchRadius?: number) => {
    try {
      setIsLoading(true);
      const effectiveRadius = searchRadius || radius;

      const response = await fetch(
        `${API_URL}/api/meetups/nearby?latitude=${lat}&longitude=${lng}&radius=${effectiveRadius}&status=모집중`
      );
      const data = await response.json();

      if (data.success) {
        setMeetups(data.meetups || []);
      } else {
        setMeetups([]);
      }
    } catch (_error) {
      setMeetups([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [radius]);

  // 사용자 neighborhood 설정이 변경되면 center 업데이트
  useEffect(() => {
    if (userNeighborhood?.latitude && userNeighborhood?.longitude) {
      setCenter({
        latitude: userNeighborhood.latitude,
        longitude: userNeighborhood.longitude,
      });
      setSearchCenter({
        latitude: userNeighborhood.latitude,
        longitude: userNeighborhood.longitude,
      });
    }
  }, [userNeighborhood?.latitude, userNeighborhood?.longitude]);

  // userRadius가 변경되면 radius state도 동기화
  useEffect(() => {
    setRadius(userRadius);
  }, [userRadius]);

  // Initial load & radius 변경시 재검색
  useEffect(() => {
    fetchNearbyMeetups(center.latitude, center.longitude, radius);
  }, [radius]);

  // Handle marker click
  const handleMarkerClick = useCallback((meetupId: string) => {
    if (!meetupId) {
      setSelectedMeetup(null);
      return;
    }
    const meetup = meetups.find((m) => m.id === meetupId);
    setSelectedMeetup(meetup || null);
  }, [meetups]);

  // Handle map moved
  const handleMapMoved = useCallback((latitude: number, longitude: number) => {
    setSearchCenter({ latitude, longitude });
    setShowSearchButton(true);
  }, []);

  // Handle search here
  const handleSearchHere = useCallback(() => {
    setCenter(searchCenter);
    setShowSearchButton(false);
    setSelectedMeetup(null);
    fetchNearbyMeetups(searchCenter.latitude, searchCenter.longitude, radius);
  }, [searchCenter, fetchNearbyMeetups, radius]);

  // Handle meetup detail
  const handleMeetupDetail = useCallback((meetupId: string) => {
    setSelectedMeetup(null);
    navigation.navigate('MeetupDetail', { meetupId });
  }, [navigation]);

  // Handle meetup card press
  const handleMeetupPress = useCallback((meetup: Meetup) => {
    navigation.navigate('MeetupDetail', { meetupId: meetup.id });
  }, [navigation]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNearbyMeetups(center.latitude, center.longitude, radius);
  }, [center, fetchNearbyMeetups, radius]);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      setViewMode('list');
    }
  }, [searchQuery]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Handle radius change
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
  }, []);

  // Build list title (matches web format)
  const listTitle = useMemo(() => {
    if (selectedCategory) {
      return `${selectedCategory} 약속`;
    }
    return `반경 ${formatRadiusLabel(radius)} 약속`;
  }, [selectedCategory, radius]);

  const listCountStr = useMemo(() => {
    const count = displayMeetups.length;
    return count > 0 ? `총 ${count}개의 약속` : '';
  }, [displayMeetups.length]);

  // Active filter count for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGender) count += 1;
    if (selectedAge) count += 1;
    return count;
  }, [selectedGender, selectedAge]);

  // Render map below list (matches web mapListBelow)
  const renderMapBelowList = () => (
    <ScrollView style={styles.mapListBelow} showsVerticalScrollIndicator={false}>
      <View style={styles.listTitleRow}>
        <Text style={styles.mapListTitle}>{listTitle}</Text>
        {listCountStr ? <Text style={styles.listCount}>{listCountStr}</Text> : null}
      </View>
      {isLoading ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map(i => <MeetupCardSkeleton key={i} />)}
        </View>
      ) : displayMeetups.length === 0 ? (
        <FadeIn>
          <EmptyState
            compact
            icon="search"
            title={selectedCategory ? `${selectedCategory} 약속이 없어요` : searchQuery ? '조건에 맞는 약속이 없어요' : '주변에 약속이 없어요'}
            description={selectedCategory ? '다른 카테고리를 선택해보세요' : '검색 조건을 변경해보세요'}
          />
        </FadeIn>
      ) : (
        <FadeIn>
          <View style={styles.meetupList}>
            {displayMeetups.map((meetup, index) => (
              <View key={meetup.id}>
                <View style={styles.meetupItemWrapper}>
                  <MeetupCard
                    meetup={meetup}
                    onPress={handleMeetupPress}
                    variant="compact"
                  />
                  {meetup.distance != null && (
                    <View style={styles.distanceBadge}>
                      <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                      <Text style={styles.distanceText} numberOfLines={1}>{formatDistance(meetup.distance)}</Text>
                    </View>
                  )}
                </View>
                {index < displayMeetups.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
        </FadeIn>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header: Search Bar */}
        <View style={styles.header}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Icon name="search" size={18} color={COLORS.neutral.grey400} />
            <TextInput
              style={styles.searchInput}
              placeholder="신청한 모임을 찾아봐요"
              placeholderTextColor={COLORS.neutral.grey400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => { handleClearSearch(); fetchNearbyMeetups(center.latitude, center.longitude, radius); }}
                activeOpacity={0.7}
                style={styles.searchClearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="x" size={14} color={COLORS.neutral.grey400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Segmented Control: 지도 / 리스트 */}
        <View style={styles.segmentedRow}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, viewMode === 'map' && styles.segmentButtonActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, viewMode === 'map' && styles.segmentTextActive]}>지도</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, viewMode === 'list' && styles.segmentButtonActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>리스트</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs */}
        <CategoryTabBar
          selectedCategory={selectedCategory}
          onCategoryChange={(cat) => setSelectedCategory(cat)}
        />

        {/* Filter Row: 3 dropdown buttons */}
        <View style={styles.filterRow}>
          {/* Radius filter */}
          <TouchableOpacity
            style={styles.filterChip}
            activeOpacity={0.7}
            onPress={() => {
              // Cycle through radius options
              const currentIdx = RADIUS_OPTIONS.findIndex(o => o.value === radius);
              const nextIdx = (currentIdx + 1) % RADIUS_OPTIONS.length;
              handleRadiusChange(RADIUS_OPTIONS[nextIdx].value);
            }}
          >
            <Text style={styles.filterChipText}>반경 {formatRadiusLabel(radius)}</Text>
            <Icon name="chevron-down" size={14} color={COLORS.neutral.grey600} />
          </TouchableOpacity>

          {/* Gender filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedGender ? styles.filterChipActive : undefined]}
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={[styles.filterChipText, selectedGender ? styles.filterChipTextActive : undefined]}>
              {selectedGender || '성별'}
            </Text>
            <Icon name="chevron-down" size={14} color={selectedGender ? COLORS.primary.main : COLORS.neutral.grey600} />
          </TouchableOpacity>

          {/* Age filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedAge ? styles.filterChipActive : undefined]}
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={[styles.filterChipText, selectedAge ? styles.filterChipTextActive : undefined]}>
              {selectedAge || '나이'}
            </Text>
            <Icon name="chevron-down" size={14} color={selectedAge ? COLORS.primary.main : COLORS.neutral.grey600} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {viewMode === 'map' ? (
            <>
              {/* Map View */}
              <MeetupMapView
                meetups={displayMeetups.map((m) => ({
                  id: m.id,
                  title: m.title,
                  latitude: m.latitude,
                  longitude: m.longitude,
                  date: m.date,
                  time: m.time,
                  location: m.location,
                  category: m.category,
                  currentParticipants: m.currentParticipants,
                  maxParticipants: m.maxParticipants,
                }))}
                center={center}
                onMarkerClick={handleMarkerClick}
                onMapMoved={handleMapMoved}
                onSearchHere={handleSearchHere}
                selectedMeetupId={selectedMeetup?.id}
                showSearchButton={showSearchButton}
              />

              {/* Loading Overlay */}
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primary.main} />
                </View>
              )}

              {/* Meetup Popup */}
              {selectedMeetup && (
                <MeetupMarkerPopup
                  meetup={selectedMeetup}
                  onDetailPress={handleMeetupDetail}
                  onClose={() => setSelectedMeetup(null)}
                />
              )}

              {/* Map below list (matches web) */}
              {renderMapBelowList()}
            </>
          ) : (
            /* List View */
            <ScrollView
              style={styles.listScrollContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary.main]}
                  tintColor={COLORS.primary.main}
                />
              }
            >
              <View style={styles.listHeader}>
                <View style={styles.listTitleRow}>
                  <Text style={styles.mapListTitle}>{listTitle}</Text>
                  {listCountStr ? <Text style={styles.listCount}>{listCountStr}</Text> : null}
                </View>
              </View>
              {isLoading ? (
                <View style={styles.skeletonPadding}>
                  {[1, 2, 3, 4, 5].map(i => <MeetupCardSkeleton key={i} />)}
                </View>
              ) : displayMeetups.length === 0 ? (
                <FadeIn>
                  <EmptyState
                    icon={searchQuery ? 'search' : 'map-pin'}
                    title={selectedCategory ? `${selectedCategory} 약속이 없어요` : searchQuery ? '조건에 맞는 약속이 없어요' : '주변에 약속이 없어요'}
                    description={selectedCategory ? '다른 카테고리를 선택해보세요' : searchQuery ? '검색어를 변경하거나 조건을 변경해보세요' : '반경을 넓히거나 위치를 변경해보세요'}
                  />
                </FadeIn>
              ) : (
                <FadeIn>
                  <View style={styles.meetupList}>
                    {displayMeetups.map((meetup, index) => (
                      <View key={meetup.id}>
                        <View style={styles.meetupItemWrapper}>
                          <MeetupCard
                            meetup={meetup}
                            onPress={handleMeetupPress}
                            variant="compact"
                          />
                          {meetup.distance != null && (
                            <View style={styles.distanceBadge}>
                              <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                              <Text style={styles.distanceText} numberOfLines={1}>{formatDistance(meetup.distance)}</Text>
                            </View>
                          )}
                        </View>
                        {index < displayMeetups.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                </FadeIn>
              )}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          )}
        </View>

        {/* FAB: Create meetup */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateMeetup')}
        >
          <Icon name="plus" size={26} color={COLORS.neutral.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <FilterDropdown
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedGender={selectedGender}
        selectedAge={selectedAge}
        onGenderChange={setSelectedGender}
        onAgeChange={setSelectedAge}
        onReset={() => { setSelectedGender(''); setSelectedAge(''); }}
      />
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
    backgroundColor: COLORS.neutral.white,
  },

  // ─── Header: pill search bar ──────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.neutral.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: COLORS.neutral.grey100, // #F5F5F5
    borderRadius: 22, // pill
    paddingHorizontal: 16,
    gap: 8,
  },
  searchBarFocused: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary.main,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.neutral.grey900, // #121212
    padding: 0,
    lineHeight: 20,
  },
  searchClearButton: {
    padding: 4,
    minWidth: 24,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Segmented Control ────────────────────────────────────
  segmentedRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100, // #F5F5F5
    borderRadius: 20, // pill bg
    padding: 3,
    alignSelf: 'stretch',
  },
  segmentButton: {
    flex: 1,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 17,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.neutral.grey500, // #878B94
  },
  segmentTextActive: {
    fontWeight: '700',
    color: COLORS.neutral.grey900, // #121212
  },

  // ─── Filter Row: 3 dropdown chips ────────────────────────
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    gap: 4,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200, // #E0E0E0
    backgroundColor: COLORS.neutral.white,
  },
  filterChipActive: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light, // #FFF8F0
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.neutral.grey600, // #5F5F5F
  },
  filterChipTextActive: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },

  // ─── Content ──────────────────────────────────────────────
  content: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },

  // ─── Map below list ───────────────────────────────────────
  mapListBelow: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },

  // ─── List Title ───────────────────────────────────────────
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  mapListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neutral.grey900, // #121212
    letterSpacing: -0.2,
  },
  listCount: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.neutral.grey500, // #878B94
  },

  // ─── List View ────────────────────────────────────────────
  listScrollContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  listHeader: {
    backgroundColor: COLORS.neutral.white,
    paddingBottom: 0,
  },

  // ─── Meetup List ──────────────────────────────────────────
  meetupList: {
    paddingHorizontal: 0,
  },
  meetupItemWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.white,
  },
  listDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey100, // #F5F5F5
    marginHorizontal: 20,
  },

  // ─── Distance Badge ───────────────────────────────────────
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // ─── Skeleton ─────────────────────────────────────────────
  skeletonPadding: {
    padding: 20,
  },

  // ─── Bottom spacer ────────────────────────────────────────
  bottomSpacer: {
    height: 100,
  },

  // ─── FAB ──────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 57,
    height: 57,
    borderRadius: 28.5,
    backgroundColor: COLORS.primary.main, // #FFA529
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.fab,
    zIndex: 100,
  },
});

export default UniversalExploreScreen;
