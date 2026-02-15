import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import MeetupMapView from '../MeetupMapView';
import MeetupMarkerPopup from '../MeetupMarkerPopup';
import EmptyState from '../EmptyState';
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

  // Handle search icon press - navigate to full search screen
  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    // If search query, switch to list view to show filtered results
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

  // Format distance for list view
  const formatDistance = (distance?: number) => {
    if (!distance) {return '';}
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  // Build list title
  const listTitle = useMemo(() => {
    const count = displayMeetups.length;
    const countStr = count > 0 ? ` ${count}개` : '';
    if (selectedCategory) {
      return `${selectedCategory} 모임${countStr}`;
    }
    return `반경 ${formatRadiusLabel(radius)} 모임${countStr}`;
  }, [selectedCategory, radius, displayMeetups.length]);

  // Render list item with distance
  const renderMeetupItem = ({ item }: { item: Meetup }) => (
    <View style={styles.listItemContainer}>
      <MeetupCard meetup={item} onPress={handleMeetupPress} />
      {item.distance && (
        <View style={styles.distanceBadge}>
          <Icon name="navigation" size={12} color={COLORS.primary.main} />
          <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
        </View>
      )}
    </View>
  );

  // Empty list component with context-specific messages
  const renderEmptyList = () => {
    if (selectedCategory) {
      return (
        <EmptyState
          compact
          icon="map-pin"
          title={`${selectedCategory} 모임이 없어요`}
          description="다른 카테고리를 선택해보세요"
        />
      );
    }
    return (
      <EmptyState
        icon="map-pin"
        title="주변에 모임이 없어요"
        description="반경을 넓히거나 다른 위치를 검색해보세요"
      />
    );
  };

  // Loading skeleton list
  const renderLoadingSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <MeetupCardSkeleton />
        </View>
      ))}
    </View>
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
            >
              <Icon name="map" size={16} color={viewMode === 'map' ? 'white' : COLORS.text.secondary} />
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>지도</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Icon name="list" size={16} color={viewMode === 'list' ? 'white' : COLORS.text.secondary} />
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>리스트</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Tabs (배민 스타일 underline) */}
        <View style={styles.categoryTabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryTab,
                !selectedCategory && styles.categoryTabActive,
              ]}
              onPress={() => handleCategoryChange(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  !selectedCategory && styles.categoryTabTextActive,
                ]}
              >
                전체
              </Text>
            </TouchableOpacity>
            {CATEGORY_NAMES.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.categoryTab,
                  selectedCategory === name && styles.categoryTabActive,
                ]}
                onPress={() => handleCategoryChange(name)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === name && styles.categoryTabTextActive,
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
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={18} color={COLORS.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="모임 이름, 장소, 카테고리 검색"
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearSearch}
                >
                  <Icon name="x" size={16} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.advancedSearchButton}
              onPress={handleSearchPress}
            >
              <Icon name="filter" size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>
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

          {/* Search Result Count */}
          {searchQuery.trim() && (
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultText}>
                검색 결과: {displayMeetups.length}개 모임
              </Text>
            </View>
          )}
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
            </>
          ) : (
            /* List View */
            <FlatList
              data={displayMeetups}
              keyExtractor={(item) => item.id}
              renderItem={renderMeetupItem}
              contentContainerStyle={[
                styles.listContainer,
                displayMeetups.length === 0 && !isLoading && styles.emptyListContainer,
              ]}
              ListHeaderComponent={
                <View style={styles.listHeaderContainer}>
                  <Text style={styles.listHeaderTitle}>{listTitle}</Text>
                </View>
              }
              ListEmptyComponent={
                isLoading ? renderLoadingSkeletons() : renderEmptyList()
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary.main]}
                  tintColor={COLORS.primary.main}
                />
              }
              showsVerticalScrollIndicator={false}
            />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Category Tabs (배민 스타일 underline)
  categoryTabBar: {
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  categoryTabScroll: {
    paddingHorizontal: 16,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: COLORS.text.primary,
  },
  categoryTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  categoryTabTextActive: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Search Section
  searchSection: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  advancedSearchButton: {
    backgroundColor: COLORS.neutral.background,
    padding: 12,
    borderRadius: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey100,
    borderWidth: 1,
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

  searchResultInfo: {
    marginTop: 8,
    paddingVertical: 4,
  },
  searchResultText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
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

  // List View
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listHeaderContainer: {
    marginBottom: 8,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingBottom: 8,
  },
  listItemContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    ...SHADOWS.small,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // Skeleton Loading
  skeletonContainer: {
    paddingVertical: 8,
  },
  skeletonItem: {
    marginBottom: 12,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  toggleTextActive: {
    color: 'white',
  },
});

export default UniversalExploreScreen;
