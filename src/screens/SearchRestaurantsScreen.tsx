import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTypedNavigation } from '../hooks/useNavigation';
import { COLORS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import { Icon } from '../components/Icon';
import restaurantApiService, { Restaurant, SearchRestaurantsOpts } from '../services/restaurantApiService';

// ============================================================
// SearchRestaurantsScreen — 잇테이블 v2 매장/메뉴 검색 (React Native 포팅)
// 웹(.web.tsx)과 데이터/로직 동일. 지도 뷰(WebKakaoMap)는 웹 전용이라 제외 — 리스트 뷰만.
// ============================================================

// 네이티브 환경에서만 Geolocation 모듈 로드 (웹은 navigator.geolocation 사용)
let Geolocation: any = null;
if (Platform.OS !== 'web') {
  try {
    Geolocation = require('@react-native-community/geolocation').default;
  } catch (_e) {
    // 모듈 없음 — 거리 필터·정렬 비활성
  }
}

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
  const navigation = useTypedNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [recentViews, setRecentViews] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 위치 (geolocation)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');

  // 필터
  const [distanceIdx, setDistanceIdx] = useState(0); // DISTANCE_OPTIONS index
  const [priceIdx, setPriceIdx] = useState(0);       // PRICE_OPTIONS index
  const [ratingIdx, setRatingIdx] = useState(0);     // RATING_OPTIONS index
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);

  // 필터 선택 모달 (거리/가격대/평점 — 웹의 <select> 대체)
  const [filterModal, setFilterModal] = useState<null | {
    title: string;
    options: string[];
    selectedIdx: number;
    onSelect: (idx: number) => void;
  }>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최신 검색 컨텍스트 (디바운스/필터 변경 시 doSearch가 항상 최신 값 사용)
  const queryRef = useRef('');
  const filtersRef = useRef<{
    distanceIdx: number; priceIdx: number; ratingIdx: number;
    availableOnly: boolean; sortByDistance: boolean;
    myLocation: { lat: number; lng: number } | null;
  }>({ distanceIdx: 0, priceIdx: 0, ratingIdx: 0, availableOnly: false, sortByDistance: false, myLocation: null });

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_KEY);
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch { /* ignore */ }
    })();

    loadRecentViews();

    // 사용자 현재 위치 가져오기 (실패/거부 시 거리 필터·정렬 비활성)
    if (Geolocation) {
      Geolocation.getCurrentPosition(
        (pos: any) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          setLocationPermission('granted');
        },
        () => setLocationPermission('denied'),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    } else {
      setLocationPermission('denied');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const updated = [trimmed, ...recentSearches.filter((k) => k !== trimmed)].slice(0, 10);
    setRecentSearches(updated);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const removeRecent = (keyword: string) => {
    const updated = recentSearches.filter((k) => k !== keyword);
    setRecentSearches(updated);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
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
    const hasLoc = !!f.myLocation;

    const opts: SearchRestaurantsOpts = {};
    if (hasLoc) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentSearches]);

  // 필터 변경 시 재검색 (검색어가 있을 때만). filtersRef는 위 effect에서 이미 동기화됨
  useEffect(() => {
    if (queryRef.current) {
      doSearch(queryRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceIdx, priceIdx, ratingIdx, availableOnly, sortByDistance, myLocation]);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      setQuery('');
      queryRef.current = '';
      setResults([]);
      setSearched(false);
    } else {
      const cat = CATEGORIES.find((c) => c.id === catId);
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
    // RootTabParamList에 v2 스택 스크린이 아직 없어 as any 캐스트 (RestaurantHomeScreen 패턴)
    navigation.navigate('RestaurantDetail' as any, { restaurantId: id });
  };

  const clearQuery = () => {
    setQuery('');
    queryRef.current = '';
    setResults([]);
    setSearched(false);
    setSelectedCategory('all');
  };

  const formatRating = (rating?: number) => (rating ? rating.toFixed(1) : '-');

  const hasLocation = locationPermission === 'granted' && !!myLocation;

  // ── Restaurant Card (리스트) ──
  const renderRestaurantCard = ({ item: restaurant }: { item: Restaurant }) => (
    <TouchableOpacity
      style={cardStyles.container}
      activeOpacity={0.85}
      onPress={() => handleCardClick(restaurant.id)}
    >
      <View style={cardStyles.imageWrapper}>
        {restaurant.imageUrl ? (
          <Image source={{ uri: restaurant.imageUrl }} style={cardStyles.image} />
        ) : (
          <View style={cardStyles.imagePlaceholder}>
            <Text style={{ fontSize: 32 }}>🍽️</Text>
          </View>
        )}
        {restaurant.category && (
          <View style={cardStyles.categoryBadge}>
            <Text style={cardStyles.categoryBadgeText}>{restaurant.category}</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={1}>{restaurant.name}</Text>
        <View style={cardStyles.meta}>
          <Text style={cardStyles.rating}>★ {formatRating(restaurant.avgRating)}</Text>
          {restaurant.reviewCount != null && (
            <Text style={cardStyles.reviewCount}>리뷰 {restaurant.reviewCount}</Text>
          )}
          {restaurant.distance != null && (
            <Text style={cardStyles.distance}>· {formatDistance(restaurant.distance)}</Text>
          )}
        </View>
        {restaurant.minPrice != null && (
          <Text style={cardStyles.price}>{formatPrice(restaurant.minPrice)}</Text>
        )}
        {restaurant.address && (
          <Text style={cardStyles.address} numberOfLines={1}>{restaurant.address}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // ── 최근 본 매장 (가로 스크롤) ──
  const renderRecentViewCard = (restaurant: Restaurant) => (
    <TouchableOpacity
      key={restaurant.id}
      style={recentViewStyles.card}
      activeOpacity={0.85}
      onPress={() => handleCardClick(restaurant.id)}
    >
      <View style={recentViewStyles.imageWrap}>
        {restaurant.imageUrl ? (
          <Image source={{ uri: restaurant.imageUrl }} style={recentViewStyles.image} />
        ) : (
          <View style={recentViewStyles.imagePlaceholder}>
            <Text style={{ fontSize: 20 }}>🍽️</Text>
          </View>
        )}
      </View>
      <Text style={recentViewStyles.name} numberOfLines={1}>{restaurant.name}</Text>
      {restaurant.category && (
        <Text style={recentViewStyles.category} numberOfLines={1}>{restaurant.category}</Text>
      )}
    </TouchableOpacity>
  );

  // ── 검색 전 콘텐츠 (최근/인기 검색어, 최근 본 매장) ──
  const renderPreSearch = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
      {/* 최근 검색어 */}
      {recentSearches.length > 0 && (
        <View style={pageStyles.section}>
          <View style={pageStyles.sectionHeader}>
            <Text style={pageStyles.sectionTitle}>최근 검색어</Text>
            <TouchableOpacity onPress={clearAllRecent}>
              <Text style={pageStyles.seeAll}>전체 삭제</Text>
            </TouchableOpacity>
          </View>
          <View>
            {recentSearches.map((kw) => (
              <View key={kw} style={pageStyles.recentChip}>
                <Icon name="clock" size={13} color={COLORS.text.tertiary} />
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleRecentClick(kw)}>
                  <Text style={pageStyles.recentChipText}>{kw}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pageStyles.removeBtn} onPress={() => removeRecent(kw)}>
                  <Icon name="x" size={12} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 인기 검색어 */}
      <View style={pageStyles.section}>
        <View style={pageStyles.sectionHeader}>
          <Text style={pageStyles.sectionTitle}>인기 검색어</Text>
        </View>
        <View style={pageStyles.trendingWrap}>
          {TRENDING_KEYWORDS.map((kw, idx) => (
            <TouchableOpacity
              key={kw}
              style={pageStyles.trendingChip}
              onPress={() => handleRecentClick(kw)}
            >
              <Text style={pageStyles.trendingRank}>{idx + 1}</Text>
              <Text style={pageStyles.trendingLabel}>{kw}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 최근 본 매장 */}
      {recentViews.length > 0 && (
        <View style={pageStyles.section}>
          <View style={pageStyles.sectionHeader}>
            <Text style={pageStyles.sectionTitle}>최근 본 매장</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pageStyles.recentViewScroll}
          >
            {recentViews.map(renderRecentViewCard)}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );

  // ── 검색 결과 ──
  const renderResults = () => {
    if (loading) {
      return (
        <View style={pageStyles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      );
    }
    if (results.length === 0) {
      return (
        <View style={pageStyles.emptyState}>
          <View style={pageStyles.emptyIcon}>
            <Icon name="search" size={40} color={COLORS.neutral.grey300} />
          </View>
          <Text style={pageStyles.emptyTitle}>검색 결과가 없어요</Text>
          <Text style={pageStyles.emptyDesc}>
            '{query}'에 대한 매장을 찾을 수 없어요.{'\n'}다른 키워드나 필터로 검색해보세요.
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        renderItem={renderRestaurantCard}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={pageStyles.resultListContent}
        ListHeaderComponent={
          <View style={pageStyles.resultHeader}>
            <Text style={pageStyles.sectionTitle}>검색결과</Text>
            <Text style={pageStyles.resultCount}>{results.length}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    );
  };

  return (
    <SafeAreaView style={pageStyles.wrapper}>
      {/* 헤더 — 검색바 */}
      <View style={pageStyles.header}>
        <TouchableOpacity style={pageStyles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={pageStyles.searchBar}>
          <Icon name="search" size={18} color={COLORS.neutral.grey400} />
          <TextInput
            style={pageStyles.searchInput}
            value={query}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            placeholder="매장명, 메뉴, 지역 검색"
            placeholderTextColor={COLORS.neutral.grey400}
            autoCapitalize="none"
          />
          {!!query && (
            <TouchableOpacity style={pageStyles.clearBtn} onPress={clearQuery}>
              <Icon name="x" size={16} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 카테고리 필터 — 가로 스크롤 pill */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={pageStyles.categoryScroll}
        contentContainerStyle={pageStyles.categoryScrollContent}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                pageStyles.categoryChip,
                { backgroundColor: active ? COLORS.primary.main : COLORS.secondary.light },
              ]}
              onPress={() => handleCategoryClick(cat.id)}
            >
              <Text
                style={[
                  pageStyles.categoryChipText,
                  { color: active ? '#FFFFFF' : COLORS.text.secondary },
                ]}
              >
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 검색 후에만: 필터 바 (지도 뷰 토글은 제외 — 리스트 전용) */}
      {searched && (
        <View style={pageStyles.toolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pageStyles.filterScrollContent}
          >
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
              label={distanceIdx > 0 ? DISTANCE_OPTIONS[distanceIdx].label : '거리'}
              isActive={distanceIdx > 0}
              disabled={!hasLocation}
              onPress={() => hasLocation && setFilterModal({
                title: '거리',
                options: DISTANCE_OPTIONS.map((o) => o.label),
                selectedIdx: distanceIdx,
                onSelect: setDistanceIdx,
              })}
            />
            {/* 가격대 */}
            <FilterSelect
              label={priceIdx > 0 ? PRICE_OPTIONS[priceIdx].label : '가격대'}
              isActive={priceIdx > 0}
              onPress={() => setFilterModal({
                title: '가격대',
                options: PRICE_OPTIONS.map((o) => o.label),
                selectedIdx: priceIdx,
                onSelect: setPriceIdx,
              })}
            />
            {/* 평점 */}
            <FilterSelect
              label={ratingIdx > 0 ? RATING_OPTIONS[ratingIdx].label : '평점'}
              isActive={ratingIdx > 0}
              onPress={() => setFilterModal({
                title: '평점',
                options: RATING_OPTIONS.map((o) => o.label),
                selectedIdx: ratingIdx,
                onSelect: setRatingIdx,
              })}
            />
          </ScrollView>

          {!hasLocation && (
            <View style={pageStyles.locationHint}>
              <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
              <Text style={pageStyles.locationHintText}>
                위치 권한을 허용하면 거리 정렬·필터를 쓸 수 있어요
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 콘텐츠 영역 — 리스트 뷰 전용 (지도 뷰 제외) */}
      <View style={pageStyles.content}>
        {!searched ? renderPreSearch() : renderResults()}
      </View>

      {/* 필터 선택 모달 (웹의 <select> 대체) */}
      <Modal
        visible={!!filterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModal(null)}
      >
        <TouchableOpacity
          style={pageStyles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModal(null)}
        >
          <TouchableOpacity style={pageStyles.filterModalSheet} activeOpacity={1} onPress={() => {}}>
            {filterModal && (
              <>
                <Text style={pageStyles.filterModalTitle}>{filterModal.title}</Text>
                {filterModal.options.map((opt, idx) => {
                  const selected = filterModal.selectedIdx === idx;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={pageStyles.filterModalOption}
                      onPress={() => { filterModal.onSelect(idx); setFilterModal(null); }}
                    >
                      <Text
                        style={[
                          pageStyles.filterModalOptionText,
                          selected && { color: COLORS.primary.main, fontWeight: '700' },
                        ]}
                      >
                        {opt}
                      </Text>
                      {selected && <Icon name="check" size={16} color={COLORS.primary.main} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ── 토글형 필터 Pill (예약가능 / 거리순 등) ──
const FilterPill: React.FC<{
  label: string;
  isActive: boolean;
  disabled?: boolean;
  onPress: () => void;
}> = ({ label, isActive, disabled = false, onPress }) => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    style={[
      pillStyles.base,
      {
        borderColor: isActive ? COLORS.primary.main : COLORS.secondary.warm,
        borderWidth: isActive ? 1.5 : 1,
        backgroundColor: isActive ? COLORS.primary.light : '#FFFFFF',
        opacity: disabled ? 0.45 : 1,
      },
    ]}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: isActive ? '700' : '500',
        color: isActive ? COLORS.primary.main : COLORS.text.primary,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ── 셀렉트형 필터 (거리/가격대/평점) — 탭 시 선택 모달 ──
const FilterSelect: React.FC<{
  label: string;
  isActive: boolean;
  disabled?: boolean;
  onPress: () => void;
}> = ({ label, isActive, disabled = false, onPress }) => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    style={[
      pillStyles.base,
      {
        flexDirection: 'row',
        borderColor: isActive ? COLORS.primary.main : COLORS.secondary.warm,
        borderWidth: isActive ? 1.5 : 1,
        backgroundColor: isActive ? COLORS.primary.light : '#FFFFFF',
        opacity: disabled ? 0.45 : 1,
      },
    ]}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: isActive ? '700' : '500',
        color: isActive ? COLORS.primary.main : COLORS.text.primary,
        marginRight: 4,
      }}
    >
      {label}
    </Text>
    <Icon name="chevron-down" size={11} color={isActive ? COLORS.primary.main : COLORS.text.tertiary} />
  </TouchableOpacity>
);

// ── Styles ──

const pageStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text.primary, padding: 0 },
  clearBtn: { alignItems: 'center', justifyContent: 'center', padding: 2 },

  categoryScroll: { flexGrow: 0, backgroundColor: '#FFFFFF' },
  categoryScrollContent: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.pill,
    justifyContent: 'center',
  },
  categoryChipText: { fontSize: 13, fontWeight: '500' },

  // 필터 툴바
  toolbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    paddingBottom: 10,
  },
  filterScrollContent: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  locationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  locationHintText: { fontSize: 12, color: COLORS.text.tertiary },

  content: { flex: 1 },

  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary },
  seeAll: { fontSize: 13, color: COLORS.text.tertiary },
  resultCount: { fontSize: 14, fontWeight: '500', color: COLORS.primary.main, marginLeft: 6 },

  // 최근 검색어
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  recentChipText: { fontSize: 14, color: COLORS.text.primary },
  removeBtn: { alignItems: 'center', justifyContent: 'center', padding: 4 },

  // 인기 검색어
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  trendingChip: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  trendingRank: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary.main,
    width: 20,
    textAlign: 'center',
  },
  trendingLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text.primary },

  // 최근 본 매장
  recentViewScroll: { gap: 12, paddingBottom: 4 },

  // 검색 결과 리스트
  resultListContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

  // 로딩/빈 상태
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 64 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.neutral.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', lineHeight: 21 },

  // 필터 선택 모달
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterModalSheet: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  filterModalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.md },
  filterModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  filterModalOptionText: { fontSize: 15, color: COLORS.text.primary },
});

const pillStyles = StyleSheet.create({
  base: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.pill,
  },
});

// ── Card Styles (리스트) ──
const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  imageWrapper: { width: 110, minHeight: 110, flexShrink: 0 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  info: { flex: 1, padding: 14, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { fontSize: 13, color: COLORS.primary.main, fontWeight: '600' },
  reviewCount: { fontSize: 13, color: COLORS.text.tertiary },
  distance: { fontSize: 13, color: COLORS.text.tertiary, fontWeight: '500' },
  price: { fontSize: 13, fontWeight: '600', color: COLORS.text.secondary, marginTop: 2 },
  address: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 2 },
});

// ── Recent View Card Styles (가로 스크롤) ──
const recentViewStyles = StyleSheet.create({
  card: { width: 120 },
  imageWrap: { width: 120, height: 80, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  name: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  category: { fontSize: 11, color: COLORS.text.tertiary, marginTop: 2 },
});

export default SearchRestaurantsScreen;
