import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { BORDER_RADIUS, LIST_ITEM_STYLE, HEADER_STYLE, SPACING } from '../styles/spacing';
import { Icon } from '../components/Icon';
import WebKakaoMap, { MapMarker, MapBounds } from '../components/WebKakaoMap';
import MeetupCard from '../components/MeetupCard';
import CategoryTabBar from '../components/CategoryTabBar';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import { FadeIn } from '../components/animated';
import { MeetupCardSkeleton } from '../components/skeleton';
import { getCategoryByName } from '../constants/categories';

const DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 }; // 서울시청

const GENDER_OPTIONS = [
  { label: '전체', value: '' },
  { label: '남성', value: '남성' },
  { label: '여성', value: '여성' },
];

const AGE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '20대', value: '20대' },
  { label: '30대', value: '30대' },
  { label: '40대', value: '40대' },
  { label: '50대+', value: '50대' },
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
  ageRange?: string;
  genderPreference?: string;
  status?: string;
  image?: string;
  hostName?: string;
  distance?: number | null;
  createdAt?: string;
  created_at?: string;
}

/** Category color helper */
const getCategoryColor = (category: string): string => {
  const cat = getCategoryByName(category);
  return cat ? cat.color : COLORS.primary.main;
};

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [popupCloseHovered, setPopupCloseHovered] = useState(false);
  const [popupDetailHovered, setPopupDetailHovered] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const bottomCardRef = useRef<HTMLDivElement>(null);

  // 필터 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilters &&
        filterDropdownRef.current &&
        filterButtonRef.current &&
        !filterDropdownRef.current.contains(event.target as Node) &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  // 사용자 현재 위치 가져오기
  useEffect(() => {
    if (Platform.OS !== 'web' || !navigator.geolocation) {
      setLocationPermission('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        setCenter(loc);
        setLocationPermission('granted');
      },
      () => {
        setLocationPermission('denied');
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  // 모임 목록 로드
  const fetchMeetups = useCallback(async (lat?: number, lng?: number, bounds?: MapBounds | null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('latitude', lat.toString());
        params.append('longitude', lng.toString());
      }
      if (bounds) {
        params.append('south', bounds.south.toString());
        params.append('north', bounds.north.toString());
        params.append('west', bounds.west.toString());
        params.append('east', bounds.east.toString());
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '100');

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
  }, [searchQuery]);

  // 초기 로드 및 center 변경 시 데이터 로드
  useEffect(() => {
    fetchMeetups(center.lat, center.lng);
  }, [center.lat, center.lng, fetchMeetups]);

  const handleSearchSubmit = () => {
    fetchMeetups(center.lat, center.lng, mapBounds);
  };

  const handleSearchHere = (newCenter: { lat: number; lng: number }) => {
    setCenter(newCenter);
    fetchMeetups(newCenter.lat, newCenter.lng, mapBounds);
  };

  const handleBoundsChanged = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setSelectedMeetup(null);
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

  const handleMyLocationClick = () => {
    if (myLocation) {
      setCenter(myLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          setCenter(loc);
          setLocationPermission('granted');
        },
        () => {
          setLocationPermission('denied');
        }
      );
    }
  };

  // 카테고리 + 성별 + 나이 필터링
  const displayMeetups = useMemo(() => meetups.filter(m => {
    if (selectedCategory && m.category !== selectedCategory) return false;
    if (selectedGender && m.genderPreference && !['무관', '상관없음', '혼성'].includes(m.genderPreference) && m.genderPreference !== selectedGender) return false;
    if (selectedAge && m.ageRange && !['무관', '상관없음'].includes(m.ageRange) && !m.ageRange.includes(selectedAge.replace('+', ''))) return false;
    return true;
  }), [meetups, selectedCategory, selectedGender, selectedAge]);

  // 지도 뷰일 때 bounds 기반 필터링
  const visibleMeetups = useMemo(() => {
    if (viewMode !== 'map' || !mapBounds) return displayMeetups;
    return displayMeetups.filter(m => {
      if (!m.latitude || !m.longitude) return false;
      return (
        m.latitude >= mapBounds.south &&
        m.latitude <= mapBounds.north &&
        m.longitude >= mapBounds.west &&
        m.longitude <= mapBounds.east
      );
    });
  }, [displayMeetups, mapBounds, viewMode]);

  // 마커 데이터 변환 (필터링된 것만)
  const mapMarkers: MapMarker[] = useMemo(() =>
    displayMeetups
      .filter(m => m.latitude && m.longitude)
      .map(m => ({
        id: m.id,
        latitude: m.latitude!,
        longitude: m.longitude!,
        title: m.title,
        category: m.category,
      })),
    [displayMeetups]
  );

  const hasActiveFilters = selectedGender !== '' || selectedAge !== '';
  const listTitle = selectedCategory ? `${selectedCategory} 약속` : '전체 약속';
  const showLocationBanner = locationPermission === 'denied' && !locationBannerDismissed && viewMode === 'map';

  return (
    <View style={styles.container}>
      {/* Sticky Header Area */}
      <div style={{
        position: 'sticky' as any,
        top: 0,
        zIndex: 10,
        backgroundColor: COLORS.neutral.white,
      }}>
        {/* Search Bar */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: COLORS.neutral.white,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            backgroundColor: COLORS.neutral.grey100,
            borderRadius: 22,
            paddingLeft: 16,
            paddingRight: 12,
            gap: 8,
            border: searchFocused ? `1.5px solid ${COLORS.primary.accent}` : '1.5px solid transparent',
            transition: `border-color ${TRANSITIONS.normal}`,
          }}>
            <TextInput
              style={styles.searchInput}
              placeholder="신청한 모임을 찾아봐요"
              placeholderTextColor="#7E8082"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => { setSearchQuery(''); fetchMeetups(center.lat, center.lng); }}
                style={styles.searchClearButton}
              >
                <Icon name="times" size={14} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            ) : (
              <Icon name="search" size={18} color="#7E8082" />
            )}
          </div>
        </div>

        {/* Segmented Control: 지도 / 리스트 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px 12px',
          backgroundColor: COLORS.neutral.white,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            height: 40,
            backgroundColor: '#f1f2f3',
            borderRadius: 99,
            padding: 4,
            width: '100%',
            maxWidth: 335,
          }}>
            <SegmentedTab
              label="지도"
              isActive={viewMode === 'map'}
              onPress={() => setViewMode('map')}
            />
            <SegmentedTab
              label="리스트"
              isActive={viewMode === 'list'}
              onPress={() => setViewMode('list')}
            />
          </div>
        </div>

        {/* Category Tabs: Horizontal scroll, text-only active state */}
        <div style={{
          backgroundColor: COLORS.neutral.white,
          borderBottom: '1px solid #e4e6e8',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            paddingLeft: 20,
            paddingRight: 12,
            gap: 32,
            scrollbarWidth: 'none',
          }}>
            <CategoryTab
              label="전체"
              isActive={!selectedCategory}
              onPress={() => handleCategoryChange(null)}
            />
            <CategoryTab
              label="한식"
              isActive={selectedCategory === '한식'}
              onPress={() => handleCategoryChange('한식')}
            />
            <CategoryTab
              label="중식"
              isActive={selectedCategory === '중식'}
              onPress={() => handleCategoryChange('중식')}
            />
            <CategoryTab
              label="양식"
              isActive={selectedCategory === '양식'}
              onPress={() => handleCategoryChange('양식')}
            />
            <CategoryTab
              label="일식"
              isActive={selectedCategory === '일식'}
              onPress={() => handleCategoryChange('일식')}
            />
            <CategoryTab
              label="고기"
              isActive={selectedCategory === '고기'}
              onPress={() => handleCategoryChange('고기')}
            />
            <CategoryTab
              label="분식"
              isActive={selectedCategory === '분식'}
              onPress={() => handleCategoryChange('분식')}
            />
            <CategoryTab
              label="해산물"
              isActive={selectedCategory === '해산물'}
              onPress={() => handleCategoryChange('해산물')}
            />
            <CategoryTab
              label="찌개"
              isActive={selectedCategory === '찌개'}
              onPress={() => handleCategoryChange('찌개')}
            />
          </div>
        </div>

        {/* Filter Row (list view only) */}
        {viewMode === 'list' && (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 4,
            padding: '10px 20px',
            backgroundColor: COLORS.neutral.white,
            borderBottom: `1px solid ${COLORS.neutral.grey100}`,
            position: 'relative',
          }}>
            <FilterPill
              ref={filterButtonRef}
              label={selectedGender || '성별'}
              isActive={selectedGender !== ''}
              onPress={() => setShowFilters(!showFilters)}
            />
            <FilterPill
              label={selectedAge || '나이'}
              isActive={selectedAge !== ''}
              onPress={() => setShowFilters(!showFilters)}
            />
            <FilterPill
              label="정렬"
              isActive={false}
              onPress={() => setShowFilters(!showFilters)}
            />

            {/* 필터 드롭다운 패널 */}
            {showFilters && (
              <div
                ref={filterDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 20,
                  zIndex: 100,
                  minWidth: 280,
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: BORDER_RADIUS.xl,
                  border: `1px solid ${COLORS.neutral.grey100}`,
                  boxShadow: CSS_SHADOWS.large,
                  padding: SPACING.lg,
                  marginTop: 4,
                }}
              >
                {/* 성별 필터 */}
                <div style={{ marginBottom: SPACING.lg }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.text.secondary,
                    marginBottom: SPACING.sm,
                    letterSpacing: -0.1,
                  }}>
                    성별
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {GENDER_OPTIONS.map((opt) => (
                      <FilterChip
                        key={`gender-${opt.value}`}
                        label={opt.label}
                        isActive={selectedGender === opt.value}
                        onPress={() => setSelectedGender(selectedGender === opt.value ? '' : opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* 나이 필터 */}
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.text.secondary,
                    marginBottom: SPACING.sm,
                    letterSpacing: -0.1,
                  }}>
                    나이
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {AGE_OPTIONS.map((opt) => (
                      <FilterChip
                        key={`age-${opt.value}`}
                        label={opt.label}
                        isActive={selectedAge === opt.value}
                        onPress={() => setSelectedAge(selectedAge === opt.value ? '' : opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* 초기화 버튼 */}
                {hasActiveFilters && (
                  <div
                    onClick={() => {
                      setSelectedGender('');
                      setSelectedAge('');
                    }}
                    style={{
                      marginTop: SPACING.lg,
                      paddingTop: SPACING.md,
                      borderTop: `1px solid ${COLORS.neutral.grey100}`,
                      display: 'flex',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.text.tertiary,
                    }}>
                      필터 초기화
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'map' ? (
        /* ========== Map View ========== */
        <View style={styles.mapContainer}>
          {/* 위치 권한 배너 */}
          {showLocationBanner && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              backgroundColor: COLORS.functional.infoLight,
              borderBottom: `1px solid ${COLORS.functional.info}20`,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                flex: 1,
              }}>
                <Icon name="map-pin" size={14} color={COLORS.functional.info} />
                <span style={{
                  fontSize: 13,
                  color: COLORS.functional.info,
                  fontWeight: 500,
                  lineHeight: '18px',
                }}>
                  위치 권한을 허용하면 내 주변 모임을 볼 수 있어요
                </span>
              </div>
              <div
                onClick={() => setLocationBannerDismissed(true)}
                style={{
                  cursor: 'pointer',
                  padding: 4,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                <Icon name="times" size={12} color={COLORS.functional.info} />
              </div>
            </div>
          )}

          {/* 지도 */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <WebKakaoMap
              center={center}
              markers={mapMarkers}
              onMarkerClick={handleMarkerClick}
              onMapMoved={(c) => setCenter(c)}
              onBoundsChanged={handleBoundsChanged}
              height="60vh"
              showSearchButton
              onSearchHere={handleSearchHere}
              selectedMarkerId={selectedMeetup?.id || null}
              showMyLocation={locationPermission === 'granted'}
              myLocation={myLocation}
            />

            {/* 내 위치 버튼 — Figma: 52x52 circle, bottom right */}
            <MyLocationButton onClick={handleMyLocationClick} hasLocation={locationPermission === 'granted'} />

            {/* 선택된 모임 바텀 카드 — Figma: white card, borderRadius, padding 28px */}
            {selectedMeetup && (
              <div
                ref={bottomCardRef}
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: 16,
                  padding: 28,
                  boxShadow: CSS_SHADOWS.large,
                  zIndex: 20,
                  animation: 'slideUp 200ms ease-out',
                }}
              >
                <style>{`
                  @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Title: SemiBold 24px (scaled for mobile web) */}
                    <div style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#121212',
                      marginBottom: 8,
                      lineHeight: '24px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {selectedMeetup.title}
                    </div>
                    {/* Description: Regular 17px → 14px for mobile */}
                    {selectedMeetup.location && (
                      <div style={{
                        fontSize: 14,
                        fontWeight: '400',
                        color: '#5F5F5F',
                        marginBottom: 10,
                        lineHeight: '20px',
                      }}>
                        {selectedMeetup.location}
                      </div>
                    )}
                    {/* Meta: calendar + date, user + count */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="calendar" size={14} color="#878B94" />
                        <span style={{ fontSize: 13, color: '#878B94', fontWeight: 400 }}>
                          {selectedMeetup.date} {selectedMeetup.time}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="user" size={14} color="#878B94" />
                        <span style={{
                          fontSize: 13,
                          color: selectedMeetup.currentParticipants >= selectedMeetup.maxParticipants
                            ? COLORS.functional.error
                            : '#878B94',
                          fontWeight: selectedMeetup.currentParticipants >= selectedMeetup.maxParticipants ? 600 : 400,
                        }}>
                          {selectedMeetup.currentParticipants}/{selectedMeetup.maxParticipants}명
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail on right: 45x45 */}
                  <div style={{
                    width: 45,
                    height: 45,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: COLORS.neutral.grey100,
                    flexShrink: 0,
                  }}>
                    {selectedMeetup.image && (
                      <img
                        src={selectedMeetup.image}
                        alt={selectedMeetup.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                </div>
                {/* Close button */}
                <div
                  onClick={() => setSelectedMeetup(null)}
                  onMouseEnter={() => setPopupCloseHovered(true)}
                  onMouseLeave={() => setPopupCloseHovered(false)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: BORDER_RADIUS.full,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    backgroundColor: popupCloseHovered ? COLORS.neutral.grey200 : COLORS.neutral.grey100,
                    transition: `background-color ${TRANSITIONS.fast}`,
                  }}
                  role="button"
                  aria-label="닫기"
                >
                  <Icon name="times" size={12} color={COLORS.text.tertiary} />
                </div>
                {/* Detail button */}
                <div
                  onClick={() => handleMeetupClick(selectedMeetup)}
                  onMouseEnter={() => setPopupDetailHovered(true)}
                  onMouseLeave={() => setPopupDetailHovered(false)}
                  style={{
                    marginTop: 16,
                    padding: '12px 0',
                    textAlign: 'center',
                    backgroundColor: '#FFA529',
                    color: COLORS.text.white,
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: `transform ${TRANSITIONS.normal}`,
                    transform: popupDetailHovered ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  상세보기
                </div>
              </div>
            )}
          </div>

          {/* 지도 아래 모임 리스트 */}
          <ScrollView style={styles.mapListBelow} showsVerticalScrollIndicator={false}>
            <View style={styles.listTitleRow}>
              <Text style={styles.mapListTitle}>{listTitle}</Text>
              {visibleMeetups.length > 0 && (
                <Text style={styles.listCount}>
                  {mapBounds ? `지도 영역 ${visibleMeetups.length}개` : `총 ${visibleMeetups.length}개의 약속`}
                </Text>
              )}
            </View>
            {loading ? (
              <View style={styles.skeletonPadding}>
                {[1, 2, 3].map(i => <MeetupCardSkeleton key={i} variant="compact" />)}
              </View>
            ) : visibleMeetups.length === 0 ? (
              <FadeIn>
                <EmptyState
                  compact
                  icon="search"
                  title={selectedCategory ? `${selectedCategory} 약속이 없어요` : searchQuery ? '조건에 맞는 약속이 없어요' : '이 지역에 약속이 없어요'}
                  description={selectedCategory ? '다른 카테고리를 선택해보세요' : '지도를 이동하거나 검색 조건을 변경해보세요'}
                  context="explore"
                />
              </FadeIn>
            ) : (
              <FadeIn>
                <View style={styles.meetupList}>
                  {visibleMeetups.map(meetup => (
                    <View key={meetup.id} style={styles.meetupItemWrapper}>
                      <MeetupCard
                        meetup={meetup}
                        onPress={handleMeetupClick}
                        variant="compact"
                      />
                    </View>
                  ))}
                </View>
              </FadeIn>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      ) : (
        /* ========== List View ========== */
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.skeletonPadding}>
              {[1, 2, 3, 4, 5].map(i => <MeetupCardSkeleton key={i} variant="compact" />)}
            </View>
          ) : displayMeetups.length === 0 ? (
            <FadeIn>
              <EmptyState
                icon={searchQuery ? 'search' : 'map-pin'}
                title={selectedCategory ? `${selectedCategory} 약속이 없어요` : searchQuery ? '조건에 맞는 약속이 없어요' : '주변에 약속이 없어요'}
                description={selectedCategory ? '다른 카테고리를 선택해보세요' : searchQuery ? '검색어를 변경하거나 조건을 변경해보세요' : '위치를 변경해보세요'}
                context="explore"
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
                        onPress={handleMeetupClick}
                        variant="compact"
                      />
                    </View>
                    {/* Separator between items — Figma: 1px line */}
                    {index < displayMeetups.length - 1 && (
                      <div style={{
                        height: 1,
                        backgroundColor: '#f0f0f0',
                        marginLeft: 20 + 70 + 18,
                        marginRight: 20,
                      }} />
                    )}
                  </View>
                ))}
              </View>
            </FadeIn>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB: 56x56 orange circle with + — visible in both map & list views */}
      <div
        onClick={() => navigate('/create-meetup')}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#FFA529',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          transition: `transform ${TRANSITIONS.normal}`,
        }}
        role="button"
        aria-label="새 모임 만들기"
      >
        <span style={{
          fontSize: 24,
          fontWeight: 300,
          color: '#FFFFFF',
          lineHeight: '24px',
        }}>+</span>
      </div>
    </View>
  );
};

/** Segmented Tab component — Figma pill style (orange active) */
const SegmentedTab: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        borderRadius: 999,
        backgroundColor: isActive ? '#FFA529' : 'transparent',
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        userSelect: 'none',
      }}
    >
      <span style={{
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#FFFFFF' : '#8f99a9',
        transition: `color ${TRANSITIONS.normal}`,
      }}>
        {label}
      </span>
    </div>
  );
};

/** Category Tab — Figma: active #121212 SemiBold, inactive #666 SemiBold, 14px */
const CategoryTab: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: isActive ? '#121212' : '#666666',
        transition: `color ${TRANSITIONS.normal}`,
        lineHeight: '20px',
      }}>
        {label}
      </span>
    </div>
  );
};

/** Filter Pill — Figma: border #e4e6e8, borderRadius 20, text #181a1c 14px Medium */
const FilterPill = React.forwardRef<HTMLDivElement, {
  label: string;
  isActive: boolean;
  onPress: () => void;
}>(({ label, isActive, onPress }, ref) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 16,
        paddingRight: 9,
        borderRadius: 20,
        border: isActive
          ? `1.5px solid ${COLORS.primary.main}`
          : '1px solid #e4e6e8',
        backgroundColor: isActive
          ? COLORS.primary.light
          : hovered
            ? COLORS.neutral.grey50
            : COLORS.neutral.white,
        cursor: 'pointer',
        userSelect: 'none',
        transition: `all ${TRANSITIONS.normal}`,
        flexShrink: 0,
      }}
    >
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: isActive ? COLORS.primary.main : '#181a1c',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <Icon name="chevron-down" size={12} color={isActive ? COLORS.primary.main : '#878B94'} />
    </div>
  );
});

/** My location FAB button overlaid on the map — Figma: 52x52 circle */
const MyLocationButton: React.FC<{
  onClick: () => void;
  hasLocation: boolean;
}> = ({ onClick, hasLocation }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        bottom: 80,
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.neutral.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: CSS_SHADOWS.medium,
        zIndex: 15,
        transition: `transform ${TRANSITIONS.fast}, box-shadow ${TRANSITIONS.fast}`,
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        border: `1px solid ${COLORS.neutral.grey100}`,
      }}
      role="button"
      aria-label="내 위치로 이동"
    >
      <Icon
        name="compass"
        size={22}
        color={hasLocation ? COLORS.functional.info : COLORS.text.tertiary}
      />
    </div>
  );
};

/** Reusable filter chip for the dropdown panel */
const FilterChip: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 14,
        paddingRight: 14,
        borderRadius: BORDER_RADIUS.pill,
        border: isActive
          ? `1.5px solid ${COLORS.primary.main}`
          : `1.5px solid ${COLORS.neutral.grey200}`,
        backgroundColor: isActive
          ? COLORS.primary.light
          : hovered
            ? COLORS.neutral.grey50
            : 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
        transition: `all ${TRANSITIONS.normal}`,
      }}
    >
      <span style={{
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? COLORS.primary.main : COLORS.text.secondary,
        whiteSpace: 'nowrap',
        transition: `color ${TRANSITIONS.normal}`,
      }}>
        {label}
      </span>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },

  // Search
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
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Map View
  mapContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  mapListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121212',
    letterSpacing: -0.05,
  },
  listCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#878B94',
  },

  // List View
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },

  // Meetup List
  meetupList: {
    paddingHorizontal: 0,
    paddingBottom: 80,
    gap: 0,
  },
  meetupItemWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.white,
    cursor: 'pointer',
  },

  // Distance Badge
  distanceBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
