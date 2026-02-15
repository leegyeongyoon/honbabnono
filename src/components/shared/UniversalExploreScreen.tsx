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
import { BORDER_RADIUS } from '../../styles/spacing';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import MeetupMapView from '../MeetupMapView';
import MeetupMarkerPopup from '../MeetupMarkerPopup';
import EmptyState from '../EmptyState';
import { FadeIn } from '../animated';
import { MeetupCardSkeleton } from '../skeleton';
import { useUserStore } from '../../store/userStore';
import { API_HOSTS } from '../../services/apiClient';
import { FOOD_CATEGORIES } from '../../constants/categories';

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

const CATEGORY_NAMES = FOOD_CATEGORIES.map(c => c.name);

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

  // Apply category filter on top of search filter
  const displayMeetups = useMemo(() => {
    if (!selectedCategory) {return filteredMeetups;}
    return filteredMeetups.filter(m => m.category === selectedCategory);
  }, [filteredMeetups, selectedCategory]);

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

  // Handle category change
  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  // Handle radius change
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
  }, []);

  // Build list title (matches web format)
  const listTitle = useMemo(() => {
    if (selectedCategory) {
      return `${selectedCategory} 모임`;
    }
    return `반경 ${formatRadiusLabel(radius)} 모임`;
  }, [selectedCategory, radius]);

  const listCountStr = useMemo(() => {
    const count = displayMeetups.length;
    return count > 0 ? `${count}개` : '';
  }, [displayMeetups.length]);

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
        <EmptyState
          compact
          icon="map-pin"
          title={selectedCategory ? `${selectedCategory} 모임이 없어요` : '주변에 모임이 없어요'}
          description={selectedCategory ? '다른 카테고리를 선택해보세요' : '다른 위치로 이동해보세요'}
        />
      ) : (
        <FadeIn>
          <View style={styles.meetupList}>
            {displayMeetups.map(meetup => (
              <View key={meetup.id} style={styles.meetupItemWrapper}>
                <MeetupCard
                  meetup={meetup}
                  onPress={handleMeetupPress}
                  variant="compact"
                />
                {meetup.distance != null && (
                  <View style={styles.distanceBadge}>
                    <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                    <Text style={styles.distanceText}>{formatDistance(meetup.distance)}</Text>
                  </View>
                )}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>탐색</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
              onPress={() => setViewMode('map')}
              activeOpacity={0.7}
            >
              <Icon name="map" size={16} color={viewMode === 'map' ? COLORS.text.white : COLORS.text.secondary} />
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>지도</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.7}
            >
              <Icon name="list" size={16} color={viewMode === 'list' ? COLORS.text.white : COLORS.text.secondary} />
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>리스트</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs (배민 스타일 pill 칩) */}
        <View style={styles.categoryTabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChange(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive,
                ]}
              >
                전체
              </Text>
            </TouchableOpacity>
            {CATEGORY_NAMES.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.categoryChip,
                  selectedCategory === name && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryChange(name)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === name && styles.categoryChipTextActive,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Icon name="search" size={16} color={COLORS.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="모임 검색 (제목, 위치, 카테고리)"
              placeholderTextColor={COLORS.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { handleClearSearch(); fetchNearbyMeetups(center.latitude, center.longitude, radius); }} activeOpacity={0.7}>
                <Icon name="x" size={14} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Radius Filter Chips */}
          <View style={styles.radiusRow}>
            <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
            <Text style={styles.radiusLabel}>반경</Text>
            {RADIUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.radiusChip,
                  radius === opt.value && styles.radiusChipActive,
                ]}
                onPress={() => handleRadiusChange(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    radius === opt.value && styles.radiusChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                <EmptyState
                  icon="compass"
                  title={selectedCategory ? `${selectedCategory} 모임이 없어요` : '주변에 모임이 없어요'}
                  description={selectedCategory ? '다른 카테고리를 선택해보세요' : '반경을 넓히거나 다른 검색어를 사용해보세요'}
                />
              ) : (
                <FadeIn>
                  <View style={styles.meetupList}>
                    {displayMeetups.map(meetup => (
                      <View key={meetup.id} style={styles.meetupItemWrapper}>
                        <MeetupCard
                          meetup={meetup}
                          onPress={handleMeetupPress}
                          variant="compact"
                        />
                        {meetup.distance != null && (
                          <View style={styles.distanceBadge}>
                            <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                            <Text style={styles.distanceText}>{formatDistance(meetup.distance)}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </FadeIn>
              )}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          )}
        </View>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },

  // Category Tabs (배민 스타일 pill 칩)
  categoryTabBar: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  categoryTabScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.grey100,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary.main,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  categoryChipTextActive: {
    fontWeight: '700',
    color: COLORS.text.white,
  },

  // Search Section
  searchSection: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    padding: 0,
  },

  // Radius Filter Chips
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 2,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.grey100,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  radiusChipActive: {
    backgroundColor: COLORS.primary.light,
    borderColor: COLORS.primary.main,
  },
  radiusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  radiusChipTextActive: {
    color: COLORS.primary.main,
  },

  // Content
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

  // Map below list
  mapListBelow: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },

  // List Title
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  mapListTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.1,
  },
  listCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // List View
  listScrollContainer: {
    flex: 1,
  },
  listHeader: {
    backgroundColor: COLORS.neutral.white,
    paddingBottom: 0,
  },

  // Meetup List
  meetupList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  meetupItemWrapper: {
    position: 'relative',
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  // Distance Badge
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.small,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // Skeleton Loading
  skeletonPadding: {
    padding: 16,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },

  // View Toggle (pill 형태)
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 12,
    padding: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  toggleTextActive: {
    color: COLORS.text.white,
  },
});

export default UniversalExploreScreen;
