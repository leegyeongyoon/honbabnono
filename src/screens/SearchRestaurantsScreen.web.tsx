import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { BORDER_RADIUS, SPACING, HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import WebKakaoMap, { MapMarker } from '../components/WebKakaoMap';
import restaurantApiService, { Restaurant, SearchRestaurantsOpts } from '../services/restaurantApiService';

// ============================================================
// SearchRestaurantsScreen — 잇테이블 v2 매장/메뉴 검색
// 홈 화면과 통일된 디자인 시스템 적용
// ============================================================

const CATEGORIES = [
  { id: 'all', label: '전체', emoji: '🍽️' },
  { id: 'shabu', label: '샤브샤브', emoji: '🫕' },
  { id: 'meat', label: '고깃집', emoji: '🥩' },
  { id: 'stew', label: '전골/찜', emoji: '🍲' },
  { id: 'hotpot', label: '훠궈', emoji: '🥘' },
  { id: 'course', label: '코스요리', emoji: '🍷' },
  { id: 'korean', label: '한식', emoji: '🍚' },
  { id: 'japanese', label: '일식', emoji: '🍣' },
  { id: 'chinese', label: '중식', emoji: '🥟' },
  { id: 'western', label: '양식', emoji: '🍝' },
  { id: 'buffet', label: '뷔페', emoji: '🥗' },
];

const TRENDING_KEYWORDS = ['샤브샤브', '고깃집', '회식', '데이트', '가성비', '코스요리'];
const RECENT_KEY = 'eattable_recent_searches';

// 서울시청 기본 좌표 (위치 권한 거부 시 지도 중심)
const DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 };

// 거리 필터 (반경, 미터). null = 거리 제한 없음
const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: '전체', value: null },
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
];

// 가격대 필터 (매장 최저메뉴가 기준)
const PRICE_OPTIONS: { label: string; min?: number; max?: number }[] = [
  { label: '전체' },
  { label: '~1만원', max: 10000 },
  { label: '1~2만원', min: 10000, max: 20000 },
  { label: '2~3만원', min: 20000, max: 30000 },
  { label: '3만원~', min: 30000 },
];

// 평점 필터
const RATING_OPTIONS: { label: string; value: number | null }[] = [
  { label: '전체', value: null },
  { label: '3.0★+', value: 3 },
  { label: '4.0★+', value: 4 },
  { label: '4.5★+', value: 4.5 },
];

const formatDistance = (meters?: number | null): string => {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatPrice = (won?: number | null): string => {
  if (won == null) return '';
  if (won >= 10000) {
    const man = won / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만원~`;
  }
  return `${won.toLocaleString()}원~`;
};

const SearchRestaurantsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [recentViews, setRecentViews] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // 뷰 모드 (리스트 / 지도)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // 위치 (geolocation)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // 필터
  const [distanceIdx, setDistanceIdx] = useState(0); // DISTANCE_OPTIONS index
  const [priceIdx, setPriceIdx] = useState(0);       // PRICE_OPTIONS index
  const [ratingIdx, setRatingIdx] = useState(0);     // RATING_OPTIONS index
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 최신 검색 컨텍스트 (디바운스/필터 변경 시 doSearch가 항상 최신 값 사용)
  const queryRef = useRef('');
  const filtersRef = useRef<{
    distanceIdx: number; priceIdx: number; ratingIdx: number;
    availableOnly: boolean; sortByDistance: boolean;
    myLocation: { lat: number; lng: number } | null;
  }>({ distanceIdx: 0, priceIdx: 0, ratingIdx: 0, availableOnly: false, sortByDistance: false, myLocation: null });

  // Load initial data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }

    // URL 쿼리 파라미터로 검색어가 있으면 바로 검색
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    } else {
      inputRef.current?.focus();
    }

    loadRecentViews();

    // 사용자 현재 위치 가져오기 (실패/거부 시 거리 필터·정렬 비활성)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          setMapCenter(loc);
          setLocationPermission('granted');
        },
        () => setLocationPermission('denied'),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    } else {
      setLocationPermission('denied');
    }
  }, []);

  // 필터 ref 동기화 (doSearch가 항상 최신 필터 값을 읽도록)
  useEffect(() => {
    filtersRef.current = { distanceIdx, priceIdx, ratingIdx, availableOnly, sortByDistance, myLocation };
  }, [distanceIdx, priceIdx, ratingIdx, availableOnly, sortByDistance, myLocation]);

  const loadRecentViews = async () => {
    try {
      const views = await restaurantApiService.getRecentViews();
      setRecentViews(Array.isArray(views) ? views.slice(0, 5) : []);
    } catch { /* ignore */ }
  };

  const saveRecentSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 10);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const removeRecent = (keyword: string) => {
    const updated = recentSearches.filter((s) => s !== keyword);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  };

  const doSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    queryRef.current = trimmed;
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    // 현재 필터 → 검색 opts 빌드
    const f = filtersRef.current;
    const distOpt = DISTANCE_OPTIONS[f.distanceIdx];
    const priceOpt = PRICE_OPTIONS[f.priceIdx];
    const ratingOpt = RATING_OPTIONS[f.ratingIdx];
    const hasLocation = !!f.myLocation;

    const opts: SearchRestaurantsOpts = {};
    if (hasLocation) {
      opts.lat = f.myLocation!.lat;
      opts.lng = f.myLocation!.lng;
      // 거리 필터(반경)는 위치가 있을 때만 적용
      if (distOpt?.value != null) opts.radius = distOpt.value;
      // 거리순 정렬도 위치가 있을 때만
      if (f.sortByDistance) opts.sort = 'distance';
    }
    if (priceOpt?.min != null) opts.minPrice = priceOpt.min;
    if (priceOpt?.max != null) opts.maxPrice = priceOpt.max;
    if (ratingOpt?.value != null) opts.minRating = ratingOpt.value;
    if (f.availableOnly) opts.available = true;

    try {
      const list = await restaurantApiService.searchRestaurants(trimmed, undefined, opts);
      setResults(Array.isArray(list) ? list : []);
      saveRecentSearch(trimmed);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  // 필터 변경 시 재검색 (검색어가 있을 때만). filtersRef는 위 effect에서 이미 동기화됨
  useEffect(() => {
    if (queryRef.current) {
      doSearch(queryRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceIdx, priceIdx, ratingIdx, availableOnly, sortByDistance, myLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      setQuery('');
      queryRef.current = '';
      setResults([]);
      setSearched(false);
    } else {
      const cat = CATEGORIES.find(c => c.id === catId);
      if (cat) {
        setQuery(cat.label);
        doSearch(cat.label);
      }
    }
  };

  const handleRecentClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  const handleCardClick = (id: string) => {
    navigate(`/restaurant/${id}`);
  };

  const clearQuery = () => {
    setQuery('');
    queryRef.current = '';
    setResults([]);
    setSearched(false);
    setSelectedCategory('all');
    inputRef.current?.focus();
  };

  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : '-';

  // 내 위치로 이동 / 권한 재요청
  const handleMyLocationClick = () => {
    if (myLocation) {
      setMapCenter(myLocation);
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          setMapCenter(loc);
          setLocationPermission('granted');
        },
        () => setLocationPermission('denied'),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    }
  };

  // 지도 마커 (lat/lng 있는 결과만)
  const mapMarkers: MapMarker[] = useMemo(
    () => results
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: r.id,
        latitude: r.latitude!,
        longitude: r.longitude!,
        title: r.name,
        category: r.category,
      })),
    [results],
  );

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarkerId(marker.id);
    navigate(`/restaurant/${marker.id}`);
  };

  const hasLocation = locationPermission === 'granted' && !!myLocation;

  // ── Restaurant Card (홈과 동일 스타일) ──
  const renderRestaurantCard = (restaurant: Restaurant) => {
    const isHovered = hoveredCardId === restaurant.id;
    return (
      <div
        key={restaurant.id}
        onClick={() => handleCardClick(restaurant.id)}
        onMouseEnter={() => setHoveredCardId(restaurant.id)}
        onMouseLeave={() => setHoveredCardId(null)}
        style={{
          ...cardStyles.container,
          boxShadow: isHovered ? CSS_SHADOWS.cardHover : CSS_SHADOWS.card,
          transform: isHovered ? 'translateY(-2px)' : 'none',
        }}
      >
        <div style={cardStyles.imageWrapper}>
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} style={cardStyles.image} />
          ) : (
            <div style={cardStyles.imagePlaceholder}>
              <span style={{ fontSize: 32 }}>🍽️</span>
            </div>
          )}
          {restaurant.category && (
            <div style={cardStyles.categoryBadge}>{restaurant.category}</div>
          )}
        </div>
        <div style={cardStyles.info}>
          <div style={cardStyles.name}>{restaurant.name}</div>
          <div style={cardStyles.meta}>
            <span style={cardStyles.rating}>★ {formatRating(restaurant.avgRating)}</span>
            {restaurant.reviewCount != null && (
              <span style={cardStyles.reviewCount}>리뷰 {restaurant.reviewCount}</span>
            )}
            {restaurant.distance != null && (
              <span style={cardStyles.distance}>· {formatDistance(restaurant.distance)}</span>
            )}
          </div>
          {restaurant.minPrice != null && (
            <div style={cardStyles.price}>{formatPrice(restaurant.minPrice)}</div>
          )}
          {restaurant.address && (
            <div style={cardStyles.address}>{restaurant.address}</div>
          )}
        </div>
      </div>
    );
  };

  // ── 최근 본 매장 (가로 스크롤) ──
  const renderRecentViewCard = (restaurant: Restaurant) => (
    <div
      key={restaurant.id}
      onClick={() => handleCardClick(restaurant.id)}
      style={recentViewStyles.card}
    >
      <div style={recentViewStyles.imageWrap}>
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} style={recentViewStyles.image} />
        ) : (
          <div style={recentViewStyles.imagePlaceholder}>
            <span style={{ fontSize: 20 }}>🍽️</span>
          </div>
        )}
      </div>
      <div style={recentViewStyles.name}>{restaurant.name}</div>
      {restaurant.category && (
        <div style={recentViewStyles.category}>{restaurant.category}</div>
      )}
    </div>
  );

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>
        {/* 헤더 — sticky */}
        <div style={pageStyles.header}>
          <div style={pageStyles.headerInner}>
            <span onClick={() => navigate(-1)} style={pageStyles.backBtn}>
              <Icon name="arrow-left" size={22} color={COLORS.text.primary} />
            </span>
            <div style={pageStyles.searchBar}>
              <Icon name="search" size={18} color={COLORS.neutral.grey400} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="매장명, 메뉴, 지역 검색"
                style={pageStyles.searchInput}
              />
              {query && (
                <span onClick={clearQuery} style={pageStyles.clearBtn}>
                  <Icon name="x" size={16} color={COLORS.text.tertiary} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 카테고리 필터 — 가로 스크롤 pill */}
        <div style={pageStyles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              style={{
                ...pageStyles.categoryChip,
                backgroundColor: selectedCategory === cat.id
                  ? COLORS.primary.main
                  : COLORS.secondary.light,
                color: selectedCategory === cat.id
                  ? '#FFFFFF'
                  : COLORS.text.secondary,
              }}
            >
              <span style={{ marginRight: 4 }}>{cat.emoji}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {/* 검색 후에만: 뷰 토글 + 필터 바 */}
        {searched && (
          <div style={pageStyles.toolbar}>
            {/* 리스트 / 지도 토글 */}
            <div style={pageStyles.viewToggle}>
              <ViewToggleTab
                label="리스트"
                icon="list"
                isActive={viewMode === 'list'}
                onPress={() => setViewMode('list')}
              />
              <ViewToggleTab
                label="지도"
                icon="map-pin"
                isActive={viewMode === 'map'}
                onPress={() => setViewMode('map')}
              />
            </div>

            {/* 필터 바 — 가로 스크롤 pill */}
            <div style={pageStyles.filterScroll}>
              {/* 예약가능 */}
              <FilterPill
                label="예약가능"
                isActive={availableOnly}
                onPress={() => setAvailableOnly((v) => !v)}
              />
              {/* 거리순 정렬 (위치 있을 때만) */}
              <FilterPill
                label="거리순"
                isActive={sortByDistance}
                disabled={!hasLocation}
                onPress={() => hasLocation && setSortByDistance((v) => !v)}
              />
              {/* 거리(반경) */}
              <FilterSelect
                options={DISTANCE_OPTIONS.map((o) => o.label)}
                selectedIdx={distanceIdx}
                placeholder="거리"
                disabled={!hasLocation}
                onSelect={setDistanceIdx}
              />
              {/* 가격대 */}
              <FilterSelect
                options={PRICE_OPTIONS.map((o) => o.label)}
                selectedIdx={priceIdx}
                placeholder="가격대"
                onSelect={setPriceIdx}
              />
              {/* 평점 */}
              <FilterSelect
                options={RATING_OPTIONS.map((o) => o.label)}
                selectedIdx={ratingIdx}
                placeholder="평점"
                onSelect={setRatingIdx}
              />
            </div>

            {!hasLocation && (
              <div style={pageStyles.locationHint}>
                <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
                <span>위치 권한을 허용하면 거리 정렬·필터를 쓸 수 있어요</span>
              </div>
            )}
          </div>
        )}

        {/* 콘텐츠 영역 */}
        <div style={pageStyles.content}>
          {!searched ? (
            <>
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <div style={pageStyles.section}>
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.sectionTitle}>최근 검색어</div>
                    <div onClick={clearAllRecent} style={pageStyles.seeAll}>전체 삭제</div>
                  </div>
                  <div style={pageStyles.chipWrap}>
                    {recentSearches.map((kw) => (
                      <div key={kw} style={pageStyles.recentChip}>
                        <span onClick={() => handleRecentClick(kw)} style={{ cursor: 'pointer' }}>
                          <Icon name="clock" size={13} color={COLORS.text.tertiary} />
                        </span>
                        <span
                          onClick={() => handleRecentClick(kw)}
                          style={{ cursor: 'pointer', flex: 1 }}
                        >
                          {kw}
                        </span>
                        <span onClick={() => removeRecent(kw)} style={pageStyles.removeBtn}>
                          <Icon name="x" size={12} color={COLORS.text.tertiary} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 인기 검색어 */}
              <div style={pageStyles.section}>
                <div style={pageStyles.sectionHeader}>
                  <div style={pageStyles.sectionTitle}>인기 검색어</div>
                </div>
                <div style={pageStyles.trendingWrap}>
                  {TRENDING_KEYWORDS.map((kw, idx) => (
                    <div
                      key={kw}
                      onClick={() => handleRecentClick(kw)}
                      style={pageStyles.trendingChip}
                    >
                      <span style={pageStyles.trendingRank}>{idx + 1}</span>
                      <span style={pageStyles.trendingLabel}>{kw}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 본 매장 */}
              {recentViews.length > 0 && (
                <div style={pageStyles.section}>
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.sectionTitle}>최근 본 매장</div>
                  </div>
                  <div style={pageStyles.recentViewScroll}>
                    {recentViews.map(renderRecentViewCard)}
                  </div>
                </div>
              )}
            </>
          ) : viewMode === 'map' ? (
            /* ========== 지도 뷰 ========== */
            <div style={pageStyles.mapWrap}>
              <WebKakaoMap
                center={mapCenter}
                markers={mapMarkers}
                onMarkerClick={handleMarkerClick}
                onMapMoved={(c) => setMapCenter(c)}
                selectedMarkerId={selectedMarkerId}
                showMyLocation={hasLocation}
                myLocation={myLocation}
                height="62vh"
              />
              {/* 내 위치 버튼 */}
              <div
                onClick={handleMyLocationClick}
                style={pageStyles.myLocationBtn}
                role="button"
                aria-label="내 위치로 이동"
              >
                <Icon
                  name="compass"
                  size={22}
                  color={hasLocation ? COLORS.functional.info : COLORS.text.tertiary}
                />
              </div>
              {/* 마커 없는 경우 안내 */}
              {mapMarkers.length === 0 && (
                <div style={pageStyles.mapEmptyOverlay}>
                  {results.length === 0
                    ? '검색 결과가 없어요'
                    : '지도에 표시할 위치 정보가 없어요'}
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div style={pageStyles.emptyState}>
              <div style={pageStyles.emptyIcon}>
                <Icon name="search" size={40} color={COLORS.neutral.grey300} />
              </div>
              <div style={pageStyles.emptyTitle}>검색 결과가 없어요</div>
              <div style={pageStyles.emptyDesc}>
                '{query}'에 대한 매장을 찾을 수 없어요.{'\n'}다른 키워드나 필터로 검색해보세요.
              </div>
            </div>
          ) : (
            <div style={pageStyles.section}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitle}>
                  검색결과
                  <span style={pageStyles.resultCount}>{results.length}</span>
                </div>
              </div>
              <div style={pageStyles.cardGrid}>
                {results.map(renderRestaurantCard)}
              </div>
            </div>
          )}
        </div>

        {/* 하단 여백 (탭바 간격) */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
};

// ── 뷰 토글 탭 (리스트 / 지도) ──
const ViewToggleTab: React.FC<{
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, icon, isActive, onPress }) => (
  <div
    onClick={onPress}
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      borderRadius: BORDER_RADIUS.pill,
      backgroundColor: isActive ? COLORS.primary.main : 'transparent',
      cursor: 'pointer',
      transition: `all ${TRANSITIONS.normal}`,
      userSelect: 'none',
    }}
    role="button"
    aria-pressed={isActive}
  >
    <Icon name={icon} size={14} color={isActive ? '#FFFFFF' : COLORS.text.tertiary} />
    <span style={{
      fontSize: 13,
      fontWeight: isActive ? 700 : 500,
      color: isActive ? '#FFFFFF' : COLORS.text.secondary,
      fontFamily: FONT_FAMILY,
    }}>
      {label}
    </span>
  </div>
);

// ── 토글형 필터 Pill (예약가능 / 거리순 등) ──
const FilterPill: React.FC<{
  label: string;
  isActive: boolean;
  disabled?: boolean;
  onPress: () => void;
}> = ({ label, isActive, disabled = false, onPress }) => (
  <div
    onClick={disabled ? undefined : onPress}
    style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      padding: '6px 14px',
      borderRadius: BORDER_RADIUS.pill,
      border: isActive
        ? `1.5px solid ${COLORS.primary.main}`
        : `1px solid ${COLORS.secondary.warm}`,
      backgroundColor: isActive ? COLORS.primary.light : '#FFFFFF',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      whiteSpace: 'nowrap',
      transition: `all ${TRANSITIONS.normal}`,
      userSelect: 'none',
    }}
    role="button"
    aria-pressed={isActive}
    aria-disabled={disabled}
  >
    <span style={{
      fontSize: 13,
      fontWeight: isActive ? 700 : 500,
      color: isActive ? COLORS.primary.main : COLORS.text.primary,
      fontFamily: FONT_FAMILY,
    }}>
      {label}
    </span>
  </div>
);

// ── 셀렉트형 필터 (거리/가격대/평점) — 네이티브 <select> 기반 ──
const FilterSelect: React.FC<{
  options: string[];
  selectedIdx: number;
  placeholder: string;
  disabled?: boolean;
  onSelect: (idx: number) => void;
}> = ({ options, selectedIdx, placeholder, disabled = false, onSelect }) => {
  // 0번(전체)이면 비활성 외관, 그 외엔 선택됨 외관
  const isActive = selectedIdx > 0;
  const label = isActive ? options[selectedIdx] : placeholder;

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        borderRadius: BORDER_RADIUS.pill,
        border: isActive
          ? `1.5px solid ${COLORS.primary.main}`
          : `1px solid ${COLORS.secondary.warm}`,
        backgroundColor: isActive ? COLORS.primary.light : '#FFFFFF',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        transition: `all ${TRANSITIONS.normal}`,
      }}
    >
      <span style={{
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? COLORS.primary.main : COLORS.text.primary,
        fontFamily: FONT_FAMILY,
      }}>
        {label}
      </span>
      <Icon name="chevron-down" size={11} color={isActive ? COLORS.primary.main : COLORS.text.tertiary} />
      {/* 투명 네이티브 select가 영역 전체를 덮어 드롭다운을 띄움 */}
      <select
        value={selectedIdx}
        disabled={disabled}
        onChange={(e) => onSelect(Number(e.target.value))}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        } as any}
        aria-label={placeholder}
      >
        {options.map((opt, idx) => (
          <option key={opt} value={idx}>{opt}</option>
        ))}
      </select>
    </div>
  );
};

// ── Page Styles (홈 화면 디자인 시스템과 통일) ──

const FONT_FAMILY = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const pageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderBottom: `1px solid rgba(17,17,17,0.06)`,
    padding: '12px 20px',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    cursor: 'pointer',
    flexShrink: 0,
    transition: TRANSITIONS.fast,
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.pill,
    border: '1px solid rgba(17,17,17,0.06)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: 14,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
  } as any,
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 2,
  },
  categoryScroll: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto' as const,
    backgroundColor: '#FFFFFF',
    WebkitOverflowScrolling: 'touch',
  },
  categoryChip: {
    flexShrink: 0,
    padding: '6px 14px',
    borderRadius: BORDER_RADIUS.pill,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    transition: `all ${TRANSITIONS.normal}`,
    fontFamily: FONT_FAMILY,
    cursor: 'pointer',
  },

  // 뷰 토글 + 필터 툴바
  toolbar: {
    backgroundColor: '#FFFFFF',
    borderBottom: `1px solid rgba(17,17,17,0.06)`,
    paddingBottom: 10,
  },
  viewToggle: {
    display: 'flex',
    gap: 4,
    margin: '4px 20px 10px',
    padding: 3,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.pill,
  },
  filterScroll: {
    display: 'flex',
    gap: 8,
    padding: '0 20px',
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch',
  },
  locationHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 20px 0',
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY,
  },

  // 지도 뷰
  mapWrap: {
    position: 'relative' as const,
    width: '100%',
  },
  myLocationBtn: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: CSS_SHADOWS.medium,
    border: `1px solid ${COLORS.neutral.grey100}`,
    zIndex: 15,
  },
  mapEmptyOverlay: {
    position: 'absolute' as const,
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: 'rgba(18,18,18,0.72)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: FONT_FAMILY,
    whiteSpace: 'nowrap' as const,
    zIndex: 12,
  },

  content: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
    paddingLeft: 20,
    paddingRight: 20,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.primary.main,
    marginLeft: 6,
  },

  // 최근 검색어
  chipWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  recentChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 0',
    fontSize: 14,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    borderBottom: `1px solid rgba(17,17,17,0.04)`,
    cursor: 'pointer',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    cursor: 'pointer',
  },

  // 인기 검색어
  trendingWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
  },
  trendingChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 4px',
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
    borderBottom: `1px solid rgba(17,17,17,0.04)`,
  },
  trendingRank: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary.main,
    width: 20,
    textAlign: 'center' as const,
  },
  trendingLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.text.primary,
  },

  // 최근 본 매장
  recentViewScroll: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto' as const,
    paddingBottom: 4,
    WebkitOverflowScrolling: 'touch',
  },

  // 검색 결과
  cardGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },

  // 로딩/빈 상태
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 20px',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    backgroundColor: COLORS.neutral.light,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY,
    textAlign: 'center' as const,
    lineHeight: 1.5,
    whiteSpace: 'pre-line' as const,
  },
};

// ── Card Styles (홈 화면 cardStyles와 동일) ──

const cardStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row' as const,
    borderRadius: CARD_STYLE.borderRadius,
    border: `1px solid ${CARD_STYLE.borderColor}`,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'pointer',
  },
  imageWrapper: {
    position: 'relative' as const,
    width: 110,
    minHeight: 110,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  categoryBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: FONT_FAMILY,
  },
  info: {
    flex: 1,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
  },
  rating: {
    color: COLORS.primary.main,
    fontWeight: 600,
  },
  reviewCount: {
    color: COLORS.text.tertiary,
  },
  distance: {
    color: COLORS.text.tertiary,
    fontWeight: 500,
  },
  price: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY,
    marginTop: 2,
  },
  address: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontFamily: FONT_FAMILY,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

// ── Recent View Card Styles (가로 스크롤) ──

const recentViewStyles: Record<string, React.CSSProperties> = {
  card: {
    flexShrink: 0,
    width: 120,
    cursor: 'pointer',
  },
  imageWrap: {
    width: 120,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  category: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY,
    marginTop: 2,
  },
};

export default SearchRestaurantsScreen;
