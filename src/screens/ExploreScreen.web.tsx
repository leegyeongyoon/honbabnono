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
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
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

// Inject hover styles for web
const HOVER_STYLE_ID = 'explore-hover-styles';
const injectHoverStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HOVER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HOVER_STYLE_ID;
  style.textContent = `
    .explore-category-chip:hover {
      background-color: ${COLORS.neutral.grey200} !important;
    }
    .explore-category-chip-active:hover {
      background-color: ${COLORS.primary.dark} !important;
    }
    .explore-radius-chip:hover {
      border-color: ${COLORS.primary.main} !important;
    }
    .explore-radius-chip-active:hover {
      border-color: ${COLORS.primary.main} !important;
    }
    .explore-meetup-card:hover {
      transform: translateY(-2px) !important;
      box-shadow: ${CSS_SHADOWS.medium} !important;
    }
    .explore-popup-card:hover {
      box-shadow: ${CSS_SHADOWS.hover} !important;
    }
    .explore-toggle-btn:hover {
      background-color: ${COLORS.neutral.grey200} !important;
    }
    .explore-toggle-btn-active:hover {
      background-color: ${COLORS.primary.dark} !important;
    }
    .explore-search-clear:hover {
      color: ${COLORS.text.secondary} !important;
    }
    .explore-popup-close:hover {
      background-color: ${COLORS.neutral.grey100} !important;
    }
    .explore-popup-detail:hover {
      background-color: ${COLORS.primary.dark} !important;
    }
  `;
  document.head.appendChild(style);
};

const ExploreScreen: React.FC = () => {
  // Inject hover CSS on mount
  useEffect(() => { injectHoverStyles(); }, []);

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
  const [searchFocused, setSearchFocused] = useState(false);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>탐색</Text>
          {!loading && displayMeetups.length > 0 && (
            <View style={{
              backgroundColor: COLORS.primary.light,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: 'rgba(17,17,17,0.08)',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700' as any, color: COLORS.primary.main }}>
                {displayMeetups.length}
              </Text>
            </View>
          )}
        </View>
        {/* 뷰 모드 토글 */}
        <View style={styles.viewToggle}>
          {/* @ts-ignore className for web */}
          <TouchableOpacity
            className={viewMode === 'map' ? 'explore-toggle-btn-active' : 'explore-toggle-btn'}
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.7}
          >
            <Icon name="map" size={16} color={viewMode === 'map' ? COLORS.text.white : COLORS.text.secondary} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>지도</Text>
          </TouchableOpacity>
          {/* @ts-ignore className for web */}
          <TouchableOpacity
            className={viewMode === 'list' ? 'explore-toggle-btn-active' : 'explore-toggle-btn'}
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <Icon name="list" size={16} color={viewMode === 'list' ? COLORS.text.white : COLORS.text.secondary} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>리스트</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 카테고리 탭 (배민 스타일 pill 칩) */}
      <View style={styles.categoryTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabScroll}
        >
          {/* @ts-ignore className for web */}
          <TouchableOpacity
            className={!selectedCategory ? 'explore-category-chip-active' : 'explore-category-chip'}
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => handleCategoryChange(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>전체</Text>
          </TouchableOpacity>
          {CATEGORY_NAMES.map((name) => (
            // @ts-ignore className for web
            <TouchableOpacity
              key={name}
              className={selectedCategory === name ? 'explore-category-chip-active' : 'explore-category-chip'}
              style={[styles.categoryChip, selectedCategory === name && styles.categoryChipActive]}
              onPress={() => handleCategoryChange(name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, selectedCategory === name && styles.categoryChipTextActive]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 검색바 + 반경 필터 */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Icon name="search" size={16} color={searchFocused ? COLORS.primary.main : COLORS.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="약속 검색 (제목, 위치, 카테고리)"
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); fetchNearbyMeetups(center.lat, center.lng, radius); }}
              style={styles.searchClearButton}
            >
              <Icon name="times" size={14} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        {/* 거리 필터 */}
        <View style={styles.radiusRow}>
          <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
          <Text style={styles.radiusLabel}>반경</Text>
          {RADIUS_OPTIONS.map((opt) => (
            // @ts-ignore className for web
            <TouchableOpacity
              key={opt.value}
              className={radius === opt.value ? 'explore-radius-chip-active' : 'explore-radius-chip'}
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
              className="explore-popup-card"
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                backgroundColor: COLORS.neutral.white,
                borderRadius: 10,
                padding: 16,
                boxShadow: CSS_SHADOWS.large,
                zIndex: 20,
                transition: `box-shadow 200ms ease, transform 200ms ease`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: COLORS.text.primary,
                    marginBottom: 6,
                    lineHeight: '22px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {selectedMeetup.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 12,
                      fontWeight: '600',
                      color: COLORS.primary.main,
                      backgroundColor: COLORS.primary.light,
                      padding: '3px 8px',
                      borderRadius: 10,
                    }}>
                      {selectedMeetup.category}
                    </span>
                    <span style={{
                      fontSize: 13,
                      color: COLORS.text.secondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 150,
                    }}>
                      {selectedMeetup.location}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.text.tertiary }}>
                    <span>{selectedMeetup.date} {selectedMeetup.time}</span>
                    <span style={{ color: COLORS.neutral.grey300 }}>|</span>
                    <span>{selectedMeetup.currentParticipants}/{selectedMeetup.maxParticipants}명</span>
                    {selectedMeetup.distance != null && (
                      <>
                        <span style={{ color: COLORS.neutral.grey300 }}>|</span>
                        <span style={{
                          color: COLORS.primary.main,
                          fontWeight: '600',
                          backgroundColor: COLORS.primary.light,
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 12,
                        }}>{formatDistance(selectedMeetup.distance)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className="explore-popup-close"
                  onClick={() => setSelectedMeetup(null)}
                  style={{
                    cursor: 'pointer',
                    padding: 8,
                    color: COLORS.text.tertiary,
                    fontSize: 14,
                    lineHeight: '14px',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    backgroundColor: COLORS.neutral.grey100,
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey200; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey100; }}
                  role="button"
                  aria-label="닫기"
                >
                  ✕
                </div>
              </div>
              <div
                className="explore-popup-detail"
                onClick={() => handleMeetupClick(selectedMeetup)}
                style={{
                  marginTop: 14,
                  padding: '13px 0',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #C49A70 0%, #E4C8A4 100%)',
                  color: COLORS.text.white,
                  borderRadius: 6,
                  fontSize: 15,
                  fontWeight: '700',
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'all 200ms ease',
                  boxShadow: '0 4px 12px rgba(196,154,112,0.25)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                상세보기
              </div>
            </div>
          )}

          {/* 지도 아래 모임 리스트 */}
          <ScrollView style={styles.mapListBelow} showsVerticalScrollIndicator={false}>
            <View style={styles.listTitleRow}>
              <Text style={styles.mapListTitle}>
                {selectedCategory ? `${selectedCategory}` : `반경 ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}`} 약속
              </Text>
              {displayMeetups.length > 0 && (
                <Text style={styles.listCount}>총 {displayMeetups.length}개의 약속</Text>
              )}
            </View>
            {loading ? (
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
                  {displayMeetups.map(meetup => (
                    // @ts-ignore className for web
                    <View key={meetup.id} className="explore-meetup-card" style={styles.meetupItemWrapper}>
                      <MeetupCard
                        meetup={meetup}
                        onPress={handleMeetupClick}
                        variant="compact"
                      />
                      {meetup.distance != null && (
                        <View style={styles.distanceBadge}>
                          <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                          <Text style={styles.distanceText} numberOfLines={1}>{formatDistance(meetup.distance)}</Text>
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
            <View style={styles.listTitleRow}>
              <Text style={styles.mapListTitle}>
                {selectedCategory ? `${selectedCategory}` : `반경 ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}`} 약속
              </Text>
              {displayMeetups.length > 0 && (
                <Text style={styles.listCount}>총 {displayMeetups.length}개의 약속</Text>
              )}
            </View>
          </View>
          {loading ? (
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
                {displayMeetups.map(meetup => (
                  // @ts-ignore className for web
                  <View key={meetup.id} className="explore-meetup-card" style={styles.meetupItemWrapper}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
                      variant="compact"
                    />
                    {meetup.distance != null && (
                      <View style={styles.distanceBadge}>
                        <Icon name="map-pin" size={10} color={COLORS.primary.main} />
                        <Text style={styles.distanceText} numberOfLines={1}>{formatDistance(meetup.distance)}</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
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
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary.dark,
    ...SHADOWS.small,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    transition: 'color 200ms ease',
  },
  toggleTextActive: {
    color: COLORS.text.white,
  },

  // Category Tabs (배민 스타일 pill 칩)
  categoryTabBar: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  categoryTabScroll: {
    paddingLeft: 20,
    paddingRight: 12,
    gap: 8,
  },
  categoryChip: {
    height: 40,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.neutral.grey100,
    transition: 'all 200ms ease',
    cursor: 'pointer',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary.dark,
    ...SHADOWS.small,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
    whiteSpace: 'nowrap',
  },
  categoryChipTextActive: {
    fontWeight: '600',
    color: COLORS.text.white,
  },

  // Search Section
  searchSection: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 6,
    paddingHorizontal: 20,
    gap: 10,
    transition: 'background-color 200ms ease, box-shadow 200ms ease',
  },
  searchBarFocused: {
    backgroundColor: COLORS.neutral.white,
    boxShadow: CSS_SHADOWS.focused,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
  },
  searchClearButton: {
    cursor: 'pointer',
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Radius Filter
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 2,
  },
  radiusChip: {
    height: 32,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grey300,
    transition: 'all 200ms ease',
    cursor: 'pointer',
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

  // Map View
  mapContainer: {
    flex: 1,
  },
  mapListBelow: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },

  // List Title
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
    color: COLORS.text.primary,
    letterSpacing: -0.05,
  },
  listCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },

  // List View
  listContainer: {
    flex: 1,
  },
  listHeader: {
    backgroundColor: COLORS.neutral.white,
    paddingBottom: 0,
  },

  // Meetup List
  meetupList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  meetupItemWrapper: {
    position: 'relative',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    overflow: 'hidden',
    ...CARD_STYLE,
    ...SHADOWS.small,
    transition: 'box-shadow 200ms ease, transform 200ms ease',
    cursor: 'pointer',
  },

  // Distance Badge
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },

  // Skeleton Loading
  skeletonPadding: {
    padding: 20,
  },
});

export default ExploreScreen;
