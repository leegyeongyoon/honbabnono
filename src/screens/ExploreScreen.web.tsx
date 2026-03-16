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
  const [filterButtonHovered, setFilterButtonHovered] = useState(false);
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
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>탐색</Text>
          {!loading && displayMeetups.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {displayMeetups.length}
              </Text>
            </View>
          )}
        </View>
        {/* 뷰 모드 토글 */}
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

      {/* 카테고리 탭 (이미지 기반) */}
      <CategoryTabBar
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* 검색바 + 필터 버튼 */}
      <div style={{
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md,
        paddingLeft: SPACING.screen.horizontal,
        paddingRight: SPACING.screen.horizontal,
        backgroundColor: COLORS.neutral.white,
        borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        }}>
          {/* 검색 인풋 */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            height: 48,
            backgroundColor: COLORS.neutral.white,
            borderRadius: BORDER_RADIUS.lg,
            paddingLeft: SPACING.lg,
            paddingRight: SPACING.lg,
            gap: SPACING.md,
            border: searchFocused ? `1.5px solid ${COLORS.primary.accent}` : `1.5px solid ${COLORS.neutral.grey100}`,
            boxShadow: searchFocused ? `${CSS_SHADOWS.medium}, ${CSS_SHADOWS.focused}` : CSS_SHADOWS.medium,
            transition: `border-color ${TRANSITIONS.normal}, box-shadow ${TRANSITIONS.normal}`,
          }}>
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
                onPress={() => { setSearchQuery(''); fetchMeetups(center.lat, center.lng); }}
                style={styles.searchClearButton}
              >
                <Icon name="times" size={14} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            )}
          </div>

          {/* 필터 칩 버튼 */}
          <div
            ref={filterButtonRef}
            onClick={() => setShowFilters(!showFilters)}
            onMouseEnter={() => setFilterButtonHovered(true)}
            onMouseLeave={() => setFilterButtonHovered(false)}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              height: 48,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: BORDER_RADIUS.lg,
              border: showFilters || hasActiveFilters
                ? `1.5px solid ${COLORS.primary.main}`
                : `1.5px solid ${COLORS.neutral.grey100}`,
              backgroundColor: showFilters || hasActiveFilters
                ? COLORS.primary.light
                : filterButtonHovered
                  ? COLORS.neutral.grey50
                  : COLORS.neutral.white,
              cursor: 'pointer',
              userSelect: 'none',
              position: 'relative',
              transition: `all ${TRANSITIONS.normal}`,
              boxShadow: CSS_SHADOWS.small,
              flexShrink: 0,
            }}
          >
            <Icon
              name="filter"
              size={15}
              color={showFilters || hasActiveFilters ? COLORS.primary.main : COLORS.text.tertiary}
            />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: showFilters || hasActiveFilters ? COLORS.primary.main : COLORS.text.secondary,
              whiteSpace: 'nowrap',
              transition: `color ${TRANSITIONS.normal}`,
            }}>
              필터
            </span>
            {hasActiveFilters && (
              <div style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 8,
                height: 8,
                borderRadius: BORDER_RADIUS.full,
                backgroundColor: COLORS.primary.main,
                border: `1.5px solid ${COLORS.neutral.white}`,
              }} />
            )}
          </div>
        </div>

        {/* 필터 드롭다운 패널 */}
        {showFilters && (
          <div
            ref={filterDropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: SPACING.screen.horizontal,
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

      {viewMode === 'map' ? (
        /* 지도 뷰 */
        <View style={styles.mapContainer}>
          {/* 위치 권한 배너 */}
          {showLocationBanner && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${SPACING.md}px ${SPACING.screen.horizontal}px`,
              backgroundColor: COLORS.functional.infoLight,
              borderBottom: `1px solid ${COLORS.functional.info}20`,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.sm,
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
                  marginLeft: SPACING.sm,
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

            {/* 내 위치 버튼 */}
            <MyLocationButton onClick={handleMyLocationClick} hasLocation={locationPermission === 'granted'} />

            {/* 선택된 모임 바텀시트 카드 */}
            {selectedMeetup && (
              <div
                ref={bottomCardRef}
                style={{
                  position: 'absolute',
                  bottom: SPACING.lg,
                  left: SPACING.lg,
                  right: SPACING.lg,
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: BORDER_RADIUS.xxl,
                  padding: SPACING.lg,
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
                        color: getCategoryColor(selectedMeetup.category),
                        backgroundColor: `${getCategoryColor(selectedMeetup.category)}15`,
                        padding: '3px 8px',
                        borderRadius: BORDER_RADIUS.pill,
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
                      <span style={{
                        color: selectedMeetup.currentParticipants >= selectedMeetup.maxParticipants
                          ? COLORS.functional.error
                          : COLORS.text.tertiary,
                        fontWeight: selectedMeetup.currentParticipants >= selectedMeetup.maxParticipants ? '600' : '400',
                      }}>
                        {selectedMeetup.currentParticipants}/{selectedMeetup.maxParticipants}명
                      </span>
                      {selectedMeetup.distance != null && (
                        <>
                          <span style={{ color: COLORS.neutral.grey300 }}>|</span>
                          <span style={{
                            color: COLORS.primary.main,
                            fontWeight: '600',
                            backgroundColor: COLORS.primary.light,
                            padding: '2px 8px',
                            borderRadius: BORDER_RADIUS.pill,
                            fontSize: 12,
                          }}>{formatDistance(selectedMeetup.distance)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedMeetup(null)}
                    onMouseEnter={() => setPopupCloseHovered(true)}
                    onMouseLeave={() => setPopupCloseHovered(false)}
                    style={{
                      cursor: 'pointer',
                      padding: 8,
                      color: COLORS.text.tertiary,
                      fontSize: 14,
                      lineHeight: '14px',
                      borderRadius: BORDER_RADIUS.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      backgroundColor: popupCloseHovered ? COLORS.neutral.grey200 : COLORS.neutral.grey100,
                      transition: `background-color ${TRANSITIONS.fast}`,
                      flexShrink: 0,
                    }}
                    role="button"
                    aria-label="닫기"
                  >
                    ✕
                  </div>
                </div>
                <div
                  onClick={() => handleMeetupClick(selectedMeetup)}
                  onMouseEnter={() => setPopupDetailHovered(true)}
                  onMouseLeave={() => setPopupDetailHovered(false)}
                  style={{
                    marginTop: 14,
                    padding: '13px 0',
                    textAlign: 'center',
                    background: COLORS.gradient.ctaCSS,
                    color: COLORS.text.white,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: 15,
                    fontWeight: '700',
                    cursor: 'pointer',
                    letterSpacing: '0.3px',
                    transition: `transform ${TRANSITIONS.normal}`,
                    boxShadow: CSS_SHADOWS.cta,
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
              <Text style={styles.mapListTitle}>
                {listTitle}
              </Text>
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
                {listTitle}
              </Text>
              {displayMeetups.length > 0 && (
                <Text style={styles.listCount}>총 {displayMeetups.length}개의 약속</Text>
              )}
            </View>
          </View>
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
                {displayMeetups.map(meetup => (
                  <View key={meetup.id} style={styles.meetupItemWrapper}>
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

/** My location FAB button overlaid on the map */
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
        right: SPACING.lg,
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.full,
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
        size={20}
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
    backgroundColor: COLORS.neutral.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...HEADER_STYLE.main,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: CSS_SHADOWS.stickyHeader,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    ...HEADER_STYLE.title,
  },
  countBadge: {
    backgroundColor: COLORS.primary.light,
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary.main,
  },

  // View Toggle (pill)
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.xl,
    padding: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.lg,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    transition: `color ${TRANSITIONS.normal}`,
  },
  toggleTextActive: {
    color: COLORS.text.white,
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
    padding: 8,
    minWidth: 44,
    minHeight: 44,
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
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
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
    paddingHorizontal: 0,
    gap: 0,
  },
  meetupItemWrapper: {
    position: 'relative',
    overflow: 'hidden',
    ...LIST_ITEM_STYLE,
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
    padding: SPACING.screen.horizontal,
  },
});

export default ExploreScreen;
