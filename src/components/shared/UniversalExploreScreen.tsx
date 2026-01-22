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
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import MeetupMapView from '../MeetupMapView';
import MeetupMarkerPopup from '../MeetupMarkerPopup';
import { NotificationBell } from '../NotificationBell';
import { useUserStore } from '../../store/userStore';
import { API_HOSTS } from '../../services/apiClient';

const API_URL = Platform.OS === 'web'
  ? (process.env.REACT_APP_API_URL || 'http://localhost:3001')
  : `http://${API_HOSTS[0]}:3001`;

// 기본 검색 반경 (5km)
const DEFAULT_RADIUS = 5000;

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

  // Fetch nearby meetups
  const fetchNearbyMeetups = useCallback(async (lat: number, lng: number, radius?: number) => {
    try {
      setIsLoading(true);
      const searchRadius = radius || userRadius;
      console.log(`🔍 Fetching nearby meetups with radius: ${searchRadius}m (${searchRadius / 1000}km)`);

      const response = await fetch(
        `${API_URL}/api/meetups/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}&status=모집중`
      );
      const data = await response.json();

      if (data.success) {
        setMeetups(data.meetups || []);
        console.log(`✅ Found ${data.meetups?.length || 0} meetups within ${searchRadius / 1000}km`);
      } else {
        console.error('Failed to fetch nearby meetups:', data.error);
        setMeetups([]);
      }
    } catch (error) {
      console.error('Error fetching nearby meetups:', error);
      setMeetups([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userRadius]);

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

  // Initial load & userRadius 변경시 재검색
  useEffect(() => {
    fetchNearbyMeetups(center.latitude, center.longitude, userRadius);
  }, [userRadius]);

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
    fetchNearbyMeetups(searchCenter.latitude, searchCenter.longitude, userRadius);
  }, [searchCenter, fetchNearbyMeetups, userRadius]);

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
    fetchNearbyMeetups(center.latitude, center.longitude, userRadius);
  }, [center, fetchNearbyMeetups, userRadius]);

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

  // Format distance for list view
  const formatDistance = (distance?: number) => {
    if (!distance) {return '';}
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

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

  // Empty list component
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="map-pin" size={48} color={COLORS.text.tertiary} />
      <Text style={styles.emptyTitle}>주변에 모임이 없습니다</Text>
      <Text style={styles.emptySubtitle}>
        다른 지역을 검색하거나{'\n'}새로운 모임을 만들어보세요
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>모임 탐색</Text>
            <View style={styles.headerRight}>
              <NotificationBell
                onPress={() => navigation.navigate('Notifications')}
                color={COLORS.text.white}
              />
            </View>
          </View>
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

          {/* Search Result Count */}
          {searchQuery.trim() && (
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultText}>
                검색 결과: {filteredMeetups.length}개 모임
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
                meetups={filteredMeetups.map((m) => ({
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
              data={filteredMeetups}
              keyExtractor={(item) => item.id}
              renderItem={renderMeetupItem}
              contentContainerStyle={[
                styles.listContainer,
                filteredMeetups.length === 0 && styles.emptyListContainer,
              ]}
              ListEmptyComponent={!isLoading ? renderEmptyList : null}
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

        {/* View Mode Toggle */}
        <View style={styles.viewToggleContainer}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'map' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('map')}
            >
              <Icon
                name="map"
                size={18}
                color={viewMode === 'map' ? 'white' : COLORS.text.secondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'map' && styles.toggleTextActive,
                ]}
              >
                지도
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'list' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('list')}
            >
              <Icon
                name="list"
                size={18}
                color={viewMode === 'list' ? 'white' : COLORS.text.secondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'list' && styles.toggleTextActive,
                ]}
              >
                리스트
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary.main,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    ...SHADOWS.small,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchSection: {
    backgroundColor: 'white',
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listItemContainer: {
    position: 'relative',
    marginBottom: 12,
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
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewToggleContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 4,
    ...SHADOWS.medium,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  toggleTextActive: {
    color: 'white',
  },
});

export default UniversalExploreScreen;
