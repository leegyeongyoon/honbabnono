import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from '../components/Icon';
import WebKakaoMap, { MapMarker } from '../components/WebKakaoMap';
import MeetupCard from '../components/MeetupCard';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import { FadeIn } from '../components/animated';
import { MeetupCardSkeleton } from '../components/skeleton';
import { FOOD_CATEGORIES } from '../constants/categories';

const DEFAULT_CENTER = { lat: 37.498095, lng: 127.027610 };

const RADIUS_OPTIONS = [
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
];

const formatDistance = (meters: number | null | undefined): string => {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

interface Meetup {
  id: string;
  title: string;
  category: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  priceRange?: string;
  status?: string;
  image?: string;
  hostName?: string;
  distance?: number | null;
  createdAt?: string;
  created_at?: string;
}

const CATEGORY_NAMES = FOOD_CATEGORIES.map(c => c.name);

const ExploreScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');

  const [viewMode, setViewMode] = useState<'map' | 'list'>(categoryFromUrl ? 'list' : 'map');
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [radius, setRadius] = useState(3000);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);

  // 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // 위치 권한 거부 시 기본 위치 사용
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // 모임 목록 로드 (거리 기반)
  const fetchNearbyMeetups = useCallback(async (lat?: number, lng?: number, searchRadius?: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('latitude', lat.toString());
        params.append('longitude', lng.toString());
        params.append('radius', (searchRadius || radius).toString());
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const endpoint = params.toString() ? `/meetups?${params.toString()}` : '/meetups';
      const response = await apiClient.get(endpoint);

      if (response.data?.success) {
        const meetupList = response.data.data || response.data.meetups || [];
        setMeetups(meetupList);
      } else {
        setMeetups(response.data?.meetups || response.data?.data || []);
      }
    } catch (err) {
      setMeetups([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, radius]);

  useEffect(() => {
    fetchNearbyMeetups(center.lat, center.lng, radius);
  }, [center.lat, center.lng, radius]);

  const handleSearchSubmit = () => {
    fetchNearbyMeetups(center.lat, center.lng, radius);
  };

  const handleSearchHere = (newCenter: { lat: number; lng: number }) => {
    setCenter(newCenter);
    fetchNearbyMeetups(newCenter.lat, newCenter.lng, radius);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    // URL 업데이트 (뒤로가기 지원)
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  const handleMeetupClick = (meetup: any) => {
    navigate(`/meetup/${meetup.id}`);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    const meetup = displayMeetups.find(m => m.id === marker.id);
    if (meetup) {
      setSelectedMeetup(meetup);
    }
  };

  // 카테고리 필터링
  const displayMeetups = selectedCategory
    ? meetups.filter(m => m.category === selectedCategory)
    : meetups;

  // 마커 데이터 변환 (필터링된 것만)
  const mapMarkers: MapMarker[] = displayMeetups
    .filter(m => m.latitude && m.longitude)
    .map(m => ({
      id: m.id,
      latitude: m.latitude!,
      longitude: m.longitude!,
      title: m.title,
      category: m.category,
    }));

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>탐색</Text>
        {/* 뷰 모드 토글 */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Icon name="map" size={16} color={viewMode === 'map' ? COLORS.text.white : COLORS.text.secondary} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>지도</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Icon name="list" size={16} color={viewMode === 'list' ? COLORS.text.white : COLORS.text.secondary} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>리스트</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 카테고리 탭 (배민 스타일) */}
      <View style={styles.categoryTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabScroll}
        >
          <TouchableOpacity
            style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
            onPress={() => handleCategoryChange(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>전체</Text>
          </TouchableOpacity>
          {CATEGORY_NAMES.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.categoryTab, selectedCategory === name && styles.categoryTabActive]}
              onPress={() => handleCategoryChange(name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryTabText, selectedCategory === name && styles.categoryTabTextActive]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 검색바 */}
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
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchNearbyMeetups(center.lat, center.lng, radius); }}>
              <Icon name="times" size={14} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        {/* 거리 필터 */}
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

      {viewMode === 'map' ? (
        /* 지도 뷰 */
        <View style={styles.mapContainer}>
          <WebKakaoMap
            center={center}
            markers={mapMarkers}
            onMarkerClick={handleMarkerClick}
            onMapMoved={(c) => setCenter(c)}
            height={400}
            showSearchButton
            onSearchHere={handleSearchHere}
          />

          {/* 선택된 모임 팝업 카드 */}
          {selectedMeetup && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                backgroundColor: COLORS.neutral.white,
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 }}>
                    {selectedMeetup.title}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text.secondary, marginBottom: 4 }}>
                    {selectedMeetup.category} · {selectedMeetup.location}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text.tertiary }}>
                    {selectedMeetup.date} {selectedMeetup.time} · {selectedMeetup.currentParticipants}/{selectedMeetup.maxParticipants}명
                    {selectedMeetup.distance != null && (
                      <span style={{ color: COLORS.primary.main, fontWeight: '600' }}> · {formatDistance(selectedMeetup.distance)}</span>
                    )}
                  </div>
                </div>
                <div
                  onClick={() => setSelectedMeetup(null)}
                  style={{ cursor: 'pointer', padding: 4, color: COLORS.text.tertiary }}
                >
                  ✕
                </div>
              </div>
              <div
                onClick={() => handleMeetupClick(selectedMeetup)}
                style={{
                  marginTop: 12,
                  padding: '10px 0',
                  textAlign: 'center',
                  backgroundColor: COLORS.primary.main,
                  color: COLORS.text.white,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                상세보기
              </div>
            </div>
          )}

          {/* 지도 아래 모임 리스트 */}
          <ScrollView style={styles.mapListBelow} showsVerticalScrollIndicator={false}>
            <Text style={styles.mapListTitle}>
              {selectedCategory ? `${selectedCategory}` : `반경 ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}`} 모임 {displayMeetups.length > 0 ? `${displayMeetups.length}개` : ''}
            </Text>
            {loading ? (
              <View style={{ padding: 16 }}>
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
                    <View key={meetup.id} style={{ position: 'relative' }}>
                      <MeetupCard
                        meetup={meetup}
                        onPress={handleMeetupClick}
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
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      ) : (
        /* 리스트 뷰 */
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.listHeader}>
            <Text style={styles.mapListTitle}>
              {selectedCategory ? `${selectedCategory}` : `반경 ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}`} 모임 {displayMeetups.length > 0 ? `${displayMeetups.length}개` : ''}
            </Text>
          </View>
          {loading ? (
            <View style={{ padding: 16 }}>
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
                  <View key={meetup.id}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
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
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    color: COLORS.text.white,
  },
  searchSection: {
    padding: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
  },
  mapContainer: {
    flex: 1,
  },
  mapListBelow: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  mapListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 16,
    paddingBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  meetupList: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  listHeader: {
    backgroundColor: COLORS.neutral.white,
    paddingBottom: 0,
  },
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
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  // 카테고리 탭 (배민 스타일)
  categoryTabBar: {
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  categoryTabScroll: {
    paddingHorizontal: 16,
    gap: 0,
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
    whiteSpace: 'nowrap',
  },
  categoryTabTextActive: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },
});

export default ExploreScreen;
