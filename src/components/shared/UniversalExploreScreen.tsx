import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import MeetupMapView from '../MeetupMapView';
import MeetupMarkerPopup from '../MeetupMarkerPopup';
import NotificationBell from '../NotificationBell';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
  // State
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);

  // Default center (강남역)
  const [center, setCenter] = useState({
    latitude: 37.498095,
    longitude: 127.027610,
  });

  // Search center (for "search here" functionality)
  const [searchCenter, setSearchCenter] = useState({
    latitude: 37.498095,
    longitude: 127.027610,
  });

  // Fetch nearby meetups
  const fetchNearbyMeetups = useCallback(async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/api/meetups/nearby?latitude=${lat}&longitude=${lng}&radius=5000&status=모집중`
      );
      const data = await response.json();

      if (data.success) {
        setMeetups(data.meetups || []);
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
  }, []);

  // Initial load
  useEffect(() => {
    fetchNearbyMeetups(center.latitude, center.longitude);
  }, []);

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
    fetchNearbyMeetups(searchCenter.latitude, searchCenter.longitude);
  }, [searchCenter, fetchNearbyMeetups]);

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
    fetchNearbyMeetups(center.latitude, center.longitude);
  }, [center, fetchNearbyMeetups]);

  // Handle search icon press
  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  // Format distance for list view
  const formatDistance = (distance?: number) => {
    if (!distance) return '';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>모임 탐색</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSearchPress}
          >
            <Icon name="search" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <NotificationBell navigation={navigation} />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {viewMode === 'map' ? (
          <>
            {/* Map View */}
            <MeetupMapView
              meetups={meetups.map((m) => ({
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
            data={meetups}
            keyExtractor={(item) => item.id}
            renderItem={renderMeetupItem}
            contentContainerStyle={[
              styles.listContainer,
              meetups.length === 0 && styles.emptyListContainer,
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    paddingTop: Platform.OS === 'ios' ? 50 : LAYOUT.HEADER_PADDING_VERTICAL,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
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
